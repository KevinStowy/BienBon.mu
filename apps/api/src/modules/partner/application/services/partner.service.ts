// =============================================================================
// Partner Service — main partner lifecycle service
// =============================================================================
// ADR-024: Application layer orchestrator. Depends on PartnerRepositoryPort,
// not on PrismaService directly.
// =============================================================================

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PartnerStatus } from '@bienbon/shared-types';
import { StateMachineService } from '../../../../shared/state-machine';
import type { Partner } from '../../domain/partner.entity';
import { partnerNotFound } from '../../domain/partner.errors';
import { PartnerEvent } from '../../state-machine/partner.states';
import { buildPartnerTransitionTable } from '../../state-machine/partner.transitions';
import type { BanPartnerDto, RejectRegistrationDto, SuspendPartnerDto } from '../../api/dto/create-registration.dto';
import { PartnerRepositoryPort } from '../../ports/partner.repository.port';

@Injectable()
export class PartnerService {
  private readonly transitionTable;

  constructor(
    private readonly partnerRepository: PartnerRepositoryPort,
    private readonly stateMachine: StateMachineService,
    emitter: EventEmitter2,
  ) {
    this.transitionTable = buildPartnerTransitionTable(emitter);
  }

  // ---------------------------------------------------------------------------
  // Read operations
  // ---------------------------------------------------------------------------

  async findById(partnerId: string): Promise<Partner> {
    const partner = await this.partnerRepository.findById(partnerId);

    if (!partner) {
      throw partnerNotFound(partnerId);
    }

    return partner;
  }

  async findByUserId(userId: string): Promise<Partner | null> {
    return this.partnerRepository.findByUserId(userId);
  }

  async listAll(filters: { status?: PartnerStatus; page?: number; limit?: number } = {}) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    return this.partnerRepository.listAll(
      { status: filters.status },
      { page, limit },
    );
  }

  // ---------------------------------------------------------------------------
  // State machine transitions (Admin)
  // ---------------------------------------------------------------------------

  async approve(partnerId: string, adminId: string): Promise<Partner> {
    const partner = await this.findById(partnerId);

    const nextState = await this.stateMachine.transition(
      partner.status,
      PartnerEvent.ADMIN_VALIDATE,
      this.transitionTable,
      {
        entity: partner,
        actorId: adminId,
        actorRole: 'admin',
        timestamp: new Date(),
      },
    );

    return this.updateStatus(partnerId, nextState, adminId, null);
  }

  async reject(
    partnerId: string,
    adminId: string,
    dto: RejectRegistrationDto,
  ): Promise<Partner> {
    const partner = await this.findById(partnerId);

    const nextState = await this.stateMachine.transition(
      partner.status,
      PartnerEvent.ADMIN_REJECT,
      this.transitionTable,
      {
        entity: partner,
        actorId: adminId,
        actorRole: 'admin',
        metadata: { reason: dto.reasons.join(', ') },
        timestamp: new Date(),
      },
    );

    return this.updateStatus(partnerId, nextState, adminId, dto.reasons.join(', '));
  }

  async suspend(
    partnerId: string,
    adminId: string,
    dto: SuspendPartnerDto,
  ): Promise<Partner> {
    const partner = await this.findById(partnerId);

    const nextState = await this.stateMachine.transition(
      partner.status,
      PartnerEvent.ADMIN_SUSPEND,
      this.transitionTable,
      {
        entity: partner,
        actorId: adminId,
        actorRole: 'admin',
        metadata: { reason: dto.reason },
        timestamp: new Date(),
      },
    );

    return this.updateStatus(partnerId, nextState, adminId, dto.reason);
  }

  async reactivate(partnerId: string, adminId: string): Promise<Partner> {
    const partner = await this.findById(partnerId);

    const nextState = await this.stateMachine.transition(
      partner.status,
      PartnerEvent.ADMIN_REACTIVATE,
      this.transitionTable,
      {
        entity: partner,
        actorId: adminId,
        actorRole: 'admin',
        timestamp: new Date(),
      },
    );

    return this.updateStatus(partnerId, nextState, adminId, null);
  }

  async ban(partnerId: string, adminId: string, dto: BanPartnerDto): Promise<Partner> {
    const partner = await this.findById(partnerId);

    const nextState = await this.stateMachine.transition(
      partner.status,
      PartnerEvent.ADMIN_BAN,
      this.transitionTable,
      {
        entity: partner,
        actorId: adminId,
        actorRole: 'admin',
        metadata: { reason: dto.reason, confirmed: dto.confirmed },
        timestamp: new Date(),
      },
    );

    return this.updateStatus(partnerId, nextState, adminId, dto.reason);
  }

  async cancelRegistration(partnerId: string, userId: string): Promise<Partner> {
    const partner = await this.partnerRepository.findByUserId(userId);

    if (!partner || partner.id !== partnerId) {
      throw partnerNotFound(partnerId);
    }

    const nextState = await this.stateMachine.transition(
      partner.status,
      PartnerEvent.PARTNER_CANCEL,
      this.transitionTable,
      {
        entity: partner,
        actorId: userId,
        actorRole: 'partner',
        timestamp: new Date(),
      },
    );

    return this.updateStatus(partnerId, nextState, userId, 'Partner cancelled registration');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async updateStatus(
    partnerId: string,
    status: PartnerStatus,
    changedBy: string,
    reason: string | null,
  ): Promise<Partner> {
    return this.partnerRepository.updateStatus(partnerId, {
      status,
      statusReason: reason,
      statusChangedAt: new Date(),
      statusChangedBy: changedBy,
      ...(status === PartnerStatus.ACTIVE
        ? { validatedAt: new Date(), validatedBy: changedBy }
        : {}),
    });
  }
}
