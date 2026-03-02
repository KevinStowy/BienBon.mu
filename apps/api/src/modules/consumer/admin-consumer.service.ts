// =============================================================================
// AdminConsumerService — admin operations on consumer accounts
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundError, BusinessRuleError } from '../../shared/errors/domain-error';
import type {
  ListConsumersQueryDto,
  PaginatedConsumersResponseDto,
  ConsumerDetailDto,
  ConsumerListItemDto,
} from './dto/admin-consumer.dto';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class AdminConsumerService {
  private readonly logger = new Logger(AdminConsumerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // List consumers (paginated, searchable, filterable)
  // ---------------------------------------------------------------------------

  async listConsumers(query: ListConsumersQueryDto): Promise<PaginatedConsumersResponseDto> {
    const { page, limit, search, status, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      roles: { some: { role: 'CONSUMER' } },
      deletedAt: null,
      ...(status ? { status: status as UserStatus } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const orderByField = this.mapSortField(sortBy);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const data: ConsumerListItemDto[] = users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt.toISOString(),
    }));

    return { data, total, page, limit };
  }

  // ---------------------------------------------------------------------------
  // Get consumer detail with stats
  // ---------------------------------------------------------------------------

  async getConsumerDetail(consumerId: string): Promise<ConsumerDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: consumerId },
      include: {
        consumerProfile: true,
        roles: true,
      },
    });

    if (!user || !user.roles.some((r) => r.role === 'CONSUMER')) {
      throw new NotFoundError('CONSUMER_NOT_FOUND', `Consumer with ID ${consumerId} not found`);
    }

    const [totalReservations, totalNoShows, totalClaims, spentResult] = await Promise.all([
      this.prisma.reservation.count({
        where: { consumerId: user.id },
      }),
      this.prisma.reservation.count({
        where: { consumerId: user.id, status: 'NO_SHOW' },
      }),
      this.prisma.claim.count({
        where: { consumerId: user.id },
      }),
      this.prisma.reservation.aggregate({
        where: {
          consumerId: user.id,
          status: { in: ['CONFIRMED', 'READY', 'PICKED_UP'] },
        },
        _sum: { totalPrice: true },
      }),
    ]);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      dietaryPreferences: user.consumerProfile?.dietaryPreferences ?? null,
      referralCode: user.consumerProfile?.referralCode ?? null,
      stats: {
        totalReservations,
        totalNoShows,
        totalSpent: Number(spentResult._sum.totalPrice ?? 0),
        totalClaims,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Suspend consumer
  // ---------------------------------------------------------------------------

  async suspendConsumer(consumerId: string, reason: string, admin: AuthUser): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: consumerId } });
    if (!user) {
      throw new NotFoundError('CONSUMER_NOT_FOUND', `Consumer with ID ${consumerId} not found`);
    }
    if (user.status !== 'ACTIVE') {
      throw new BusinessRuleError('INVALID_STATUS', `Cannot suspend a user with status ${user.status}`);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: consumerId },
        data: { status: 'SUSPENDED' },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorType: 'ADMIN',
          action: 'CONSUMER_SUSPENDED',
          entityType: 'User',
          entityId: consumerId,
          changes: { reason, previousStatus: user.status },
        },
      }),
    ]);

    this.logger.log(`Consumer ${consumerId} suspended by admin ${admin.id}: ${reason}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Reactivate consumer
  // ---------------------------------------------------------------------------

  async reactivateConsumer(consumerId: string, admin: AuthUser, comment?: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: consumerId } });
    if (!user) {
      throw new NotFoundError('CONSUMER_NOT_FOUND', `Consumer with ID ${consumerId} not found`);
    }
    if (user.status !== 'SUSPENDED') {
      throw new BusinessRuleError('INVALID_STATUS', `Cannot reactivate a user with status ${user.status}`);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: consumerId },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorType: 'ADMIN',
          action: 'CONSUMER_REACTIVATED',
          entityType: 'User',
          entityId: consumerId,
          changes: { comment, previousStatus: user.status },
        },
      }),
    ]);

    this.logger.log(`Consumer ${consumerId} reactivated by admin ${admin.id}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Ban consumer (SUPER_ADMIN only)
  // ---------------------------------------------------------------------------

  async banConsumer(consumerId: string, reason: string, confirmed: boolean, admin: AuthUser): Promise<{ success: boolean }> {
    if (!confirmed) {
      throw new BusinessRuleError('BAN_NOT_CONFIRMED', 'Ban action requires explicit confirmation (confirmed: true)');
    }

    const user = await this.prisma.user.findUnique({ where: { id: consumerId } });
    if (!user) {
      throw new NotFoundError('CONSUMER_NOT_FOUND', `Consumer with ID ${consumerId} not found`);
    }
    if (user.status === 'BANNED') {
      throw new BusinessRuleError('ALREADY_BANNED', 'User is already banned');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: consumerId },
        data: { status: 'BANNED' },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: admin.id,
          actorType: 'ADMIN',
          action: 'CONSUMER_BANNED',
          entityType: 'User',
          entityId: consumerId,
          changes: { reason, previousStatus: user.status },
        },
      }),
    ]);

    this.logger.log(`Consumer ${consumerId} BANNED by admin ${admin.id}: ${reason}`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapSortField(sortBy?: string): string {
    const allowed: Record<string, string> = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'email',
      status: 'status',
      createdAt: 'createdAt',
    };
    return allowed[sortBy ?? ''] ?? 'createdAt';
  }
}
