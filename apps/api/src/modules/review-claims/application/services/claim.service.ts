// =============================================================================
// ClaimService — orchestrates claim lifecycle (ADR-017, ADR-024)
// =============================================================================

import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  ClaimStatus,
  DOMAIN_EVENTS,
  PAYMENT_SERVICE,
  ResolutionType,
} from '@bienbon/shared-types';
import type { IPaymentService } from '@bienbon/shared-types';
import type {
  ClaimOpenedEvent,
  ClaimResolvedEvent,
  ClaimRejectedEvent,
} from '@bienbon/shared-types';
import { PrismaService } from '../../../../prisma/prisma.service';
import { StateMachineService } from '../../../../shared/state-machine';
import { ClaimRepositoryPort } from '../../ports/claim.repository.port';
import type { Claim } from '../../domain/entities/claim.entity';
import {
  canOpenClaim,
  isDescriptionValid,
  isPhotoCountValid,
} from '../../domain/rules/claim.rules';
import {
  claimAccessDenied,
  claimAlreadyExists,
  claimNotFound,
  claimWindowExpired,
  reservationNotFound,
  reservationNotPickedUp,
} from '../../domain/errors/review-claims.errors';
import { buildClaimTransitionTable } from '../../state-machine/claim.transitions';
import { ClaimEvent } from '../../state-machine/claim.states';
import { DomainException, ErrorCode } from '@bienbon/shared-types';

export interface OpenClaimCommand {
  reservationId: string;
  consumerId: string;
  reasonSlug: string;
  description: string;
  photoUrls?: string[];
}

export interface ResolveClaimCommand {
  type: ResolutionType;
  amount?: number;
  comment: string;
}

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);
  private readonly transitionTable = buildClaimTransitionTable();

  constructor(
    private readonly claimRepo: ClaimRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
    @Inject(PAYMENT_SERVICE) private readonly paymentService: IPaymentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Consumer operations
  // ---------------------------------------------------------------------------

  async openClaim(command: OpenClaimCommand): Promise<Claim> {
    const photoUrls = command.photoUrls ?? [];

    // 1. Validate description
    if (!isDescriptionValid(command.description)) {
      throw new DomainException(
        ErrorCode.VALIDATION_ERROR,
        'Claim description must be at least 20 characters long',
        { description: command.description },
      );
    }

    // 2. Validate photo count
    if (!isPhotoCountValid(photoUrls.length)) {
      throw new DomainException(
        ErrorCode.VALIDATION_ERROR,
        `Photo count ${photoUrls.length} is invalid — maximum 5 photos allowed`,
        { count: photoUrls.length },
      );
    }

    // 3. Fetch reservation (same monolith — direct Prisma access OK per ADR-024)
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: command.reservationId },
      include: { basket: { select: { storeId: true } } },
    });

    if (!reservation) {
      throw reservationNotFound(command.reservationId);
    }

    // 4. Guard: reservation must be PICKED_UP and within the 24-hour claim window
    if (!canOpenClaim({ status: reservation.status, pickedUpAt: reservation.pickedUpAt })) {
      if (reservation.status !== 'PICKED_UP') {
        throw reservationNotPickedUp(command.reservationId);
      }
      throw claimWindowExpired(command.reservationId);
    }

    // 5. Guard: consumer must own the reservation
    if (reservation.consumerId !== command.consumerId) {
      throw claimAccessDenied(command.reservationId, command.consumerId);
    }

    // 6. Guard: no active claim already open for this reservation
    const existingClaims = await this.claimRepo.findByReservationId(command.reservationId);
    const hasActiveClaim = existingClaims.some(
      (c) => c.status === ClaimStatus.OPEN || c.status === ClaimStatus.IN_REVIEW,
    );
    if (hasActiveClaim) {
      throw claimAlreadyExists(command.reservationId);
    }

    // 7. Create claim with photos in a single Prisma call
    const claim = await this.claimRepo.create({
      reservationId: command.reservationId,
      consumerId: command.consumerId,
      reasonSlug: command.reasonSlug,
      description: command.description,
      photoUrls,
    });

    // 8. Emit ClaimOpened domain event
    const event: ClaimOpenedEvent = {
      eventId: randomUUID(),
      eventType: DOMAIN_EVENTS.CLAIM_OPENED,
      occurredAt: new Date().toISOString(),
      aggregateId: claim.id,
      aggregateType: 'Claim',
      payload: {
        claimId: claim.id,
        reservationId: claim.reservationId,
        consumerId: claim.consumerId,
        storeId: reservation.basket.storeId,
        reasonSlug: claim.reasonSlug,
      },
      metadata: { actorId: command.consumerId },
    };

    this.eventEmitter.emit(DOMAIN_EVENTS.CLAIM_OPENED, event);

    this.logger.log(`Claim opened: ${claim.id} for reservation ${command.reservationId}`);

    return claim;
  }

  async findClaimForConsumer(claimId: string, consumerId: string): Promise<Claim> {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim) throw claimNotFound(claimId);
    if (claim.consumerId !== consumerId) throw claimAccessDenied(claimId, consumerId);
    return claim;
  }

  async listMyClaims(
    consumerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Claim[]; total: number }> {
    return this.claimRepo.findByConsumerId(consumerId, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Admin operations
  // ---------------------------------------------------------------------------

  async findById(claimId: string): Promise<Claim> {
    const claim = await this.claimRepo.findById(claimId);
    if (!claim) throw claimNotFound(claimId);
    return claim;
  }

  async listAll(
    filter: { status?: ClaimStatus; page?: number; limit?: number },
  ): Promise<{ data: Claim[]; total: number }> {
    return this.claimRepo.listAll(filter);
  }

  async takeCharge(claimId: string, adminId: string): Promise<Claim> {
    const claim = await this.findById(claimId);

    const nextState = await this.stateMachine.transition(
      claim.status,
      ClaimEvent.ADMIN_TAKE_CHARGE,
      this.transitionTable,
      {
        entity: claim,
        actorId: adminId,
        actorRole: 'admin',
        timestamp: new Date(),
      },
    );

    const updated = await this.claimRepo.update(claimId, {
      status: nextState,
      assignedAdminId: adminId,
    });

    await this.claimRepo.createStatusHistory({
      claimId,
      fromStatus: claim.status,
      toStatus: nextState,
      event: ClaimEvent.ADMIN_TAKE_CHARGE,
      actorId: adminId,
      actorRole: 'admin',
    });

    this.logger.log(`Claim ${claimId} taken charge by admin ${adminId}`);
    return updated;
  }

  async resolve(
    claimId: string,
    adminId: string,
    resolution: ResolveClaimCommand,
  ): Promise<Claim> {
    const claim = await this.findById(claimId);

    // Determine event based on resolution type
    const event =
      resolution.type === ResolutionType.FULL_REFUND
        ? ClaimEvent.ADMIN_RESOLVE_FULL_REFUND
        : ClaimEvent.ADMIN_RESOLVE_PARTIAL_REFUND;

    const metadata: Record<string, unknown> = {};
    if (resolution.amount !== undefined) {
      metadata['amount'] = resolution.amount;
    }

    const nextState = await this.stateMachine.transition(
      claim.status,
      event,
      this.transitionTable,
      {
        entity: claim,
        actorId: adminId,
        actorRole: 'admin',
        metadata,
        timestamp: new Date(),
      },
    );

    // Trigger payment refund if applicable
    let refundAmount: number | null = null;

    if (
      resolution.type === ResolutionType.FULL_REFUND ||
      resolution.type === ResolutionType.PARTIAL_REFUND
    ) {
      // Determine refund amount
      if (resolution.type === ResolutionType.PARTIAL_REFUND && resolution.amount !== undefined) {
        refundAmount = resolution.amount;
      } else if (resolution.type === ResolutionType.FULL_REFUND) {
        // For full refund, fetch the reservation to get total price
        const reservation = await this.prisma.reservation.findUnique({
          where: { id: claim.reservationId },
          select: { totalPrice: true },
        });
        refundAmount = reservation ? Number(reservation.totalPrice) : null;
      }

      if (refundAmount !== null && refundAmount > 0) {
        try {
          await this.paymentService.refund(claim.reservationId, refundAmount);
        } catch (err) {
          this.logger.error(
            `Refund failed for claim ${claimId}: ${err instanceof Error ? err.message : String(err)}`,
          );
          // Re-throw — refund failure should block resolution
          throw err;
        }
      }
    }

    const resolvedAt = new Date();
    const updated = await this.claimRepo.update(claimId, {
      status: nextState,
      resolutionType: resolution.type,
      resolutionAmount: refundAmount,
      adminComment: resolution.comment,
      resolvedBy: adminId,
      resolvedAt,
    });

    await this.claimRepo.createStatusHistory({
      claimId,
      fromStatus: claim.status,
      toStatus: nextState,
      event,
      actorId: adminId,
      actorRole: 'admin',
      metadata: { resolutionType: resolution.type, amount: refundAmount },
    });

    // Fetch reservation for event payload
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: claim.reservationId },
      include: { basket: { select: { storeId: true } } },
    });

    const domainEvent: ClaimResolvedEvent = {
      eventId: randomUUID(),
      eventType: DOMAIN_EVENTS.CLAIM_RESOLVED,
      occurredAt: resolvedAt.toISOString(),
      aggregateId: claim.id,
      aggregateType: 'Claim',
      payload: {
        claimId: claim.id,
        reservationId: claim.reservationId,
        consumerId: claim.consumerId,
        storeId: reservation?.basket.storeId ?? '',
        previousStatus: claim.status,
        resolutionType: resolution.type,
        refundAmount,
        resolvedBy: adminId,
      },
      metadata: { actorId: adminId },
    };

    this.eventEmitter.emit(DOMAIN_EVENTS.CLAIM_RESOLVED, domainEvent);

    this.logger.log(`Claim ${claimId} resolved (${resolution.type}) by admin ${adminId}`);
    return updated;
  }

  async reject(claimId: string, adminId: string, reason: string): Promise<Claim> {
    const claim = await this.findById(claimId);

    const nextState = await this.stateMachine.transition(
      claim.status,
      ClaimEvent.ADMIN_REJECT,
      this.transitionTable,
      {
        entity: claim,
        actorId: adminId,
        actorRole: 'admin',
        metadata: { reason },
        timestamp: new Date(),
      },
    );

    const resolvedAt = new Date();
    const updated = await this.claimRepo.update(claimId, {
      status: nextState,
      resolutionType: ResolutionType.REJECTED,
      adminComment: reason,
      resolvedBy: adminId,
      resolvedAt,
    });

    await this.claimRepo.createStatusHistory({
      claimId,
      fromStatus: claim.status,
      toStatus: nextState,
      event: ClaimEvent.ADMIN_REJECT,
      actorId: adminId,
      actorRole: 'admin',
      metadata: { reason },
    });

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: claim.reservationId },
      include: { basket: { select: { storeId: true } } },
    });

    const domainEvent: ClaimRejectedEvent = {
      eventId: randomUUID(),
      eventType: DOMAIN_EVENTS.CLAIM_REJECTED,
      occurredAt: resolvedAt.toISOString(),
      aggregateId: claim.id,
      aggregateType: 'Claim',
      payload: {
        claimId: claim.id,
        reservationId: claim.reservationId,
        consumerId: claim.consumerId,
        storeId: reservation?.basket.storeId ?? '',
        rejectedBy: adminId,
        reason,
      },
      metadata: { actorId: adminId },
    };

    this.eventEmitter.emit(DOMAIN_EVENTS.CLAIM_REJECTED, domainEvent);

    this.logger.log(`Claim ${claimId} rejected by admin ${adminId}`);
    return updated;
  }
}
