// =============================================================================
// Partner Service — main partner lifecycle service
// =============================================================================

import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PartnerStatus, RegistrationChannel } from '@bienbon/shared-types';
import { PrismaService } from '../../../prisma/prisma.service';
import { StateMachineService } from '../../../shared/state-machine';
import type { Partner } from '../domain/partner.entity';
import { partnerNotFound } from '../domain/partner.errors';
import { PartnerEvent } from '../state-machine/partner.states';
import { buildPartnerTransitionTable } from '../state-machine/partner.transitions';
import type { BanPartnerDto, RejectRegistrationDto, SuspendPartnerDto } from '../dto/create-registration.dto';

@Injectable()
export class PartnerService {
  private readonly transitionTable;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
    emitter: EventEmitter2,
  ) {
    this.transitionTable = buildPartnerTransitionTable(emitter);
  }

  // ---------------------------------------------------------------------------
  // Read operations
  // ---------------------------------------------------------------------------

  async findById(partnerId: string): Promise<Partner> {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { id: partnerId },
    });

    if (!profile) {
      throw partnerNotFound(partnerId);
    }

    return this.mapToPartner(profile);
  }

  async findByUserId(userId: string): Promise<Partner | null> {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { userId },
    });

    return profile ? this.mapToPartner(profile) : null;
  }

  async listAll(filters: { status?: PartnerStatus; page?: number; limit?: number } = {}) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = filters.status ? { status: filters.status } : {};

    const [data, total] = await Promise.all([
      this.prisma.partnerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          partnerStores: { include: { store: true } },
        },
      }),
      this.prisma.partnerProfile.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
    const partner = await this.findByUserId(userId);

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
    const updated = await this.prisma.partnerProfile.update({
      where: { id: partnerId },
      data: {
        status,
        statusReason: reason,
        statusChangedAt: new Date(),
        statusChangedBy: changedBy,
        validatedAt: status === PartnerStatus.ACTIVE ? new Date() : undefined,
        validatedBy: status === PartnerStatus.ACTIVE ? changedBy : undefined,
      },
    });

    return this.mapToPartner(updated);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToPartner(profile: Record<string, any>): Partner {
    return {
      id: profile.id,
      userId: profile.userId,
      status: profile.status as unknown as PartnerStatus,
      statusReason: profile.statusReason,
      statusChangedAt: profile.statusChangedAt,
      statusChangedBy: profile.statusChangedBy,
      submittedAt: profile.submittedAt,
      validatedAt: profile.validatedAt,
      validatedBy: profile.validatedBy,
      registrationChannel: profile.registrationChannel as RegistrationChannel | null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
