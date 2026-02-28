import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundError, BusinessRuleError } from '../../shared/errors/domain-error';
import { SuspensionStatus as SharedSuspensionStatus } from '@bienbon/shared-types';
import { SuspensionStatus as PrismaSuspensionStatus } from '../../generated/prisma/client';
import type { LiftSuspensionDto } from './dto/lift-suspension.dto';
import type { ListSuspensionsQueryDto } from './dto/list-suspensions-query.dto';
import type { FraudSuspensionResponseDto } from './dto/fraud-suspension-response.dto';
import type { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
import { PaginatedResponseDto as PaginatedResponse } from '../../shared/dto/pagination.dto';

/**
 * Service for managing fraud suspensions.
 * Provides list and lift operations for admins.
 */
@Injectable()
export class FraudSuspensionService {
  private readonly logger = new Logger(FraudSuspensionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // List suspensions (paginated + filterable)
  // ---------------------------------------------------------------------------
  async listSuspensions(
    query: ListSuspensionsQueryDto,
  ): Promise<PaginatedResponseDto<FraudSuspensionResponseDto>> {
    const where = {
      ...(query.status !== undefined && {
        status: query.status as unknown as PrismaSuspensionStatus,
      }),
      ...(query.userId !== undefined && { userId: query.userId }),
    };

    const [suspensions, total] = await Promise.all([
      this.prisma.fraudSuspension.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: query.sort_order ?? 'desc' },
      }),
      this.prisma.fraudSuspension.count({ where }),
    ]);

    return PaginatedResponse.create(
      suspensions.map(this.toResponseDto),
      total,
      query,
    );
  }

  // ---------------------------------------------------------------------------
  // Get single suspension
  // ---------------------------------------------------------------------------
  async getSuspension(id: string): Promise<FraudSuspensionResponseDto> {
    const suspension = await this.prisma.fraudSuspension.findUnique({ where: { id } });
    if (!suspension) {
      throw new NotFoundError(
        'FRAUD_SUSPENSION_NOT_FOUND',
        `Fraud suspension with ID ${id} not found`,
      );
    }
    return this.toResponseDto(suspension);
  }

  // ---------------------------------------------------------------------------
  // Lift suspension
  // ---------------------------------------------------------------------------
  async liftSuspension(
    id: string,
    dto: LiftSuspensionDto,
    liftedById: string,
  ): Promise<FraudSuspensionResponseDto> {
    const suspension = await this.prisma.fraudSuspension.findUnique({ where: { id } });
    if (!suspension) {
      throw new NotFoundError(
        'FRAUD_SUSPENSION_NOT_FOUND',
        `Fraud suspension with ID ${id} not found`,
      );
    }

    if (suspension.status !== PrismaSuspensionStatus.ACTIVE) {
      throw new BusinessRuleError(
        'FRAUD_SUSPENSION_NOT_ACTIVE',
        `Only ACTIVE suspensions can be lifted. Current status: ${suspension.status}`,
      );
    }

    const updated = await this.prisma.fraudSuspension.update({
      where: { id },
      data: {
        status: PrismaSuspensionStatus.LIFTED,
        liftedAt: new Date(),
        liftedBy: liftedById,
        liftComment: dto.comment,
      },
    });

    this.logger.log(`Fraud suspension lifted: ${id} by ${liftedById}`);
    return this.toResponseDto(updated);
  }

  // ---------------------------------------------------------------------------
  // Private mapper
  // ---------------------------------------------------------------------------
  private toResponseDto(
    suspension: {
      id: string;
      userId: string;
      alertId: string;
      ruleId: string;
      suspensionType: string;
      durationHours: number | null;
      reasonFr: string;
      reasonEn: string | null;
      status: PrismaSuspensionStatus;
      liftedAt: Date | null;
      liftedBy: string | null;
      liftComment: string | null;
      reservationsCancelled: number;
      refundsIssued: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ): FraudSuspensionResponseDto {
    return {
      id: suspension.id,
      userId: suspension.userId,
      alertId: suspension.alertId,
      ruleId: suspension.ruleId,
      suspensionType: suspension.suspensionType,
      durationHours: suspension.durationHours ?? undefined,
      reasonFr: suspension.reasonFr,
      reasonEn: suspension.reasonEn ?? undefined,
      status: suspension.status as unknown as SharedSuspensionStatus,
      liftedAt: suspension.liftedAt ?? undefined,
      liftedBy: suspension.liftedBy ?? undefined,
      liftComment: suspension.liftComment ?? undefined,
      reservationsCancelled: suspension.reservationsCancelled,
      refundsIssued: suspension.refundsIssued,
      createdAt: suspension.createdAt,
      updatedAt: suspension.updatedAt,
    };
  }
}
