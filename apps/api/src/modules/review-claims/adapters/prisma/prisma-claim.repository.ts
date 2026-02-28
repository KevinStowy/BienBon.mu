// =============================================================================
// PrismaClaimRepository — outbound adapter for Claim persistence
// =============================================================================

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ClaimRepositoryPort } from '../../ports/claim.repository.port';
import type { CreateClaimData, ListClaimsFilter, UpdateClaimData } from '../../ports/claim.repository.port';
import type { Claim, ClaimPhoto } from '../../domain/entities/claim.entity';
import { ClaimStatus, ResolutionType } from '@bienbon/shared-types';

@Injectable()
export class PrismaClaimRepository extends ClaimRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Claim | null> {
    const record = await this.prisma.claim.findUnique({
      where: { id },
      include: { photos: { orderBy: { position: 'asc' } } },
    });

    return record ? this.mapToClaim(record) : null;
  }

  async findByReservationId(reservationId: string): Promise<Claim[]> {
    const records = await this.prisma.claim.findMany({
      where: { reservationId },
      include: { photos: { orderBy: { position: 'asc' } } },
    });

    return records.map((r) => this.mapToClaim(r));
  }

  async findByConsumerId(
    consumerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Claim[]; total: number }> {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.claim.findMany({
        where: { consumerId },
        include: { photos: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.claim.count({ where: { consumerId } }),
    ]);

    return { data: records.map((r) => this.mapToClaim(r)), total };
  }

  async listAll(filter: ListClaimsFilter): Promise<{ data: Claim[]; total: number }> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: { status?: ClaimStatus; consumerId?: string } = {};
    if (filter.status) where.status = filter.status;
    if (filter.consumerId) where.consumerId = filter.consumerId;

    const [records, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        include: { photos: { orderBy: { position: 'asc' } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.claim.count({ where }),
    ]);

    return { data: records.map((r) => this.mapToClaim(r)), total };
  }

  async create(data: CreateClaimData): Promise<Claim> {
    const record = await this.prisma.claim.create({
      data: {
        reservationId: data.reservationId,
        consumerId: data.consumerId,
        reasonSlug: data.reasonSlug,
        description: data.description,
        photos: {
          create: data.photoUrls.map((url, index) => ({
            url,
            position: index,
          })),
        },
      },
      include: { photos: { orderBy: { position: 'asc' } } },
    });

    return this.mapToClaim(record);
  }

  async update(id: string, data: UpdateClaimData): Promise<Claim> {
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) updateData['status'] = data.status;
    if ('assignedAdminId' in data) updateData['assignedAdminId'] = data.assignedAdminId;
    if (data.resolutionType !== undefined) updateData['resolutionType'] = data.resolutionType;
    if ('resolutionAmount' in data) updateData['resolutionAmount'] = data.resolutionAmount;
    if ('adminComment' in data) updateData['adminComment'] = data.adminComment;
    if ('resolvedBy' in data) updateData['resolvedBy'] = data.resolvedBy;
    if ('resolvedAt' in data) updateData['resolvedAt'] = data.resolvedAt;

    const record = await this.prisma.claim.update({
      where: { id },
      data: updateData,
      include: { photos: { orderBy: { position: 'asc' } } },
    });

    return this.mapToClaim(record);
  }

  async createStatusHistory(data: {
    claimId: string;
    fromStatus: string;
    toStatus: string;
    event: string;
    actorId?: string;
    actorRole?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.claimStatusHistory.create({
      data: {
        claimId: data.claimId,
        fromStatus: data.fromStatus,
        toStatus: data.toStatus,
        event: data.event,
        actorId: data.actorId,
        actorRole: data.actorRole,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToClaim(record: Record<string, any>): Claim {
    return {
      id: record.id,
      reservationId: record.reservationId,
      consumerId: record.consumerId,
      reasonSlug: record.reasonSlug,
      description: record.description,
      status: record.status as unknown as ClaimStatus,
      assignedAdminId: record.assignedAdminId ?? null,
      resolutionType: record.resolutionType
        ? (record.resolutionType as unknown as ResolutionType)
        : null,
      resolutionAmount: record.resolutionAmount
        ? Number(record.resolutionAmount)
        : null,
      adminComment: record.adminComment ?? null,
      resolvedBy: record.resolvedBy ?? null,
      resolvedAt: record.resolvedAt ?? null,
      photos: (record.photos ?? []).map(
        (p: Record<string, unknown>): ClaimPhoto => ({
          id: p['id'] as string,
          url: p['url'] as string,
          position: p['position'] as number,
        }),
      ),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
