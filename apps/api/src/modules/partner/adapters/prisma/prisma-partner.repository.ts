// =============================================================================
// Prisma Partner Repository — outbound adapter (driven)
// =============================================================================
// ADR-024: Adapter pattern — implements PartnerRepositoryPort using Prisma.
// ADR-003: Database persistence via Prisma ORM.
// =============================================================================

import { Injectable } from '@nestjs/common';
import { PartnerStatus as PrismaPartnerStatus } from '../../../../generated/prisma/enums';
import { PartnerStatus } from '@bienbon/shared-types';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PartnerRepositoryPort,
  PartnerListFilters,
  PartnerPagination,
  PaginatedPartners,
  PartnerStatusUpdate,
} from '../../ports/partner.repository.port';
import type { Partner } from '../../domain/partner.entity';

/**
 * Prisma implementation of PartnerRepositoryPort.
 *
 * ADR-024: Adapter (outbound) — implements the port defined by the domain.
 * ADR-003: Database persistence via Prisma ORM.
 */
@Injectable()
export class PrismaPartnerRepository extends PartnerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(partnerId: string): Promise<Partner | null> {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { id: partnerId },
    });

    if (!profile) return null;
    return this.toEntity(profile);
  }

  async findByUserId(userId: string): Promise<Partner | null> {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { userId },
    });

    if (!profile) return null;
    return this.toEntity(profile);
  }

  async listAll(
    filters: PartnerListFilters,
    pagination: PartnerPagination,
  ): Promise<PaginatedPartners> {
    const skip = (pagination.page - 1) * pagination.limit;
    const where = filters.status
      ? { status: filters.status as unknown as PrismaPartnerStatus }
      : {};

    const [records, total] = await Promise.all([
      this.prisma.partnerProfile.findMany({
        where,
        skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
          partnerStores: { include: { store: true } },
        },
      }),
      this.prisma.partnerProfile.count({ where }),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: records.map((r: any) => this.toEntity(r)),
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async updateStatus(
    partnerId: string,
    update: PartnerStatusUpdate,
  ): Promise<Partner> {
    const updated = await this.prisma.partnerProfile.update({
      where: { id: partnerId },
      data: {
        status: update.status as unknown as PrismaPartnerStatus,
        statusReason: update.statusReason,
        statusChangedAt: update.statusChangedAt,
        statusChangedBy: update.statusChangedBy,
        ...(update.validatedAt !== undefined ? { validatedAt: update.validatedAt } : {}),
        ...(update.validatedBy !== undefined ? { validatedBy: update.validatedBy } : {}),
      },
    });

    return this.toEntity(updated);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntity(profile: Record<string, any>): Partner {
    return {
      id: profile.id,
      userId: profile.userId,
      status: profile.status as unknown as PartnerStatus,
      statusReason: profile.statusReason ?? null,
      statusChangedAt: profile.statusChangedAt ?? null,
      statusChangedBy: profile.statusChangedBy ?? null,
      submittedAt: profile.submittedAt ?? profile.createdAt,
      validatedAt: profile.validatedAt ?? null,
      validatedBy: profile.validatedBy ?? null,
      registrationChannel: profile.registrationChannel ?? null,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
