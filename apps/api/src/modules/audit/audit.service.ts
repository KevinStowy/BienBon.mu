// =============================================================================
// AuditService — read/query/export operations on AuditLog
// =============================================================================

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundError } from '../../shared/errors/domain-error';
import type {
  ListAuditQueryDto,
  PaginatedAuditResponseDto,
  AuditEntryDto,
} from './dto/audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // List audit entries (paginated, filterable)
  // ---------------------------------------------------------------------------

  async listEntries(query: ListAuditQueryDto): Promise<PaginatedAuditResponseDto> {
    const { page, limit, search, category, userId, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where = this.buildWhere({ search, category, userId, dateFrom, dateTo });

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data: AuditEntryDto[] = entries.map((e) => this.toDto(e));

    return { data, total, page, limit };
  }

  // ---------------------------------------------------------------------------
  // Get single audit entry
  // ---------------------------------------------------------------------------

  async getEntry(id: string): Promise<AuditEntryDto> {
    const entry = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!entry) {
      throw new NotFoundError('AUDIT_ENTRY_NOT_FOUND', `Audit entry with ID ${id} not found`);
    }
    return this.toDto(entry);
  }

  // ---------------------------------------------------------------------------
  // User timeline
  // ---------------------------------------------------------------------------

  async getUserTimeline(userId: string): Promise<AuditEntryDto[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return entries.map((e) => this.toDto(e));
  }

  // ---------------------------------------------------------------------------
  // Export as CSV
  // ---------------------------------------------------------------------------

  async exportCsv(query: ListAuditQueryDto): Promise<string> {
    const where = this.buildWhere({
      search: query.search,
      category: query.category,
      userId: query.userId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    const entries = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const headers = ['id', 'actorId', 'actorType', 'action', 'entityType', 'entityId', 'createdAt'];
    const rows = entries.map((e) =>
      [
        e.id,
        e.actorId ?? '',
        e.actorType,
        e.action,
        e.entityType,
        e.entityId ?? '',
        e.createdAt.toISOString(),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildWhere(params: {
    search?: string;
    category?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.search) {
      where.OR = [
        { action: { contains: params.search, mode: 'insensitive' } },
        { entityType: { contains: params.search, mode: 'insensitive' } },
        { actorType: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.category) {
      where.action = { startsWith: params.category, mode: 'insensitive' };
    }

    if (params.userId) {
      where.actorId = params.userId;
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        where.createdAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.createdAt.lte = new Date(params.dateTo);
      }
    }

    return where;
  }

  private toDto(entry: {
    id: string;
    actorId: string | null;
    actorType: string;
    action: string;
    entityType: string;
    entityId: string | null;
    changes: unknown;
    metadata: unknown;
    createdAt: Date;
  }): AuditEntryDto {
    return {
      id: entry.id,
      actorId: entry.actorId,
      actorType: entry.actorType,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      changes: entry.changes,
      metadata: entry.metadata,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
