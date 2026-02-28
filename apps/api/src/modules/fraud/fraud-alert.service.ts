import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundError, BusinessRuleError } from '../../shared/errors/domain-error';
import {
  FraudAlertSeverity as SharedFraudAlertSeverity,
  FraudAlertStatus as SharedFraudAlertStatus,
} from '@bienbon/shared-types';
import {
  FraudAlertSeverity as PrismaFraudAlertSeverity,
  FraudAlertStatus as PrismaFraudAlertStatus,
} from '../../generated/prisma/client';
import type { ResolveAlertDto } from './dto/resolve-alert.dto';
import type { ListAlertsQueryDto } from './dto/list-alerts-query.dto';
import type { FraudAlertResponseDto } from './dto/fraud-alert-response.dto';
import type { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
import { PaginatedResponseDto as PaginatedResponse } from '../../shared/dto/pagination.dto';

/**
 * Service for managing fraud alerts.
 * Provides list and review operations for admins.
 */
@Injectable()
export class FraudAlertService {
  private readonly logger = new Logger(FraudAlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // List alerts (paginated + filterable)
  // ---------------------------------------------------------------------------
  async listAlerts(
    query: ListAlertsQueryDto,
  ): Promise<PaginatedResponseDto<FraudAlertResponseDto>> {
    const where = {
      ...(query.status !== undefined && {
        status: query.status as unknown as PrismaFraudAlertStatus,
      }),
      ...(query.severity !== undefined && {
        severity: query.severity as unknown as PrismaFraudAlertSeverity,
      }),
      ...(query.actorType !== undefined && { actorType: query.actorType }),
      ...(query.actorId !== undefined && { actorId: query.actorId }),
    };

    const [alerts, total] = await Promise.all([
      this.prisma.fraudAlert.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: query.sort_order ?? 'desc' },
      }),
      this.prisma.fraudAlert.count({ where }),
    ]);

    return PaginatedResponse.create(alerts.map(this.toResponseDto), total, query);
  }

  // ---------------------------------------------------------------------------
  // Get single alert
  // ---------------------------------------------------------------------------
  async getAlert(id: string): Promise<FraudAlertResponseDto> {
    const alert = await this.prisma.fraudAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundError('FRAUD_ALERT_NOT_FOUND', `Fraud alert with ID ${id} not found`);
    }
    return this.toResponseDto(alert);
  }

  // ---------------------------------------------------------------------------
  // Mark as INVESTIGATED
  // ---------------------------------------------------------------------------
  async investigate(id: string): Promise<FraudAlertResponseDto> {
    const alert = await this.prisma.fraudAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundError('FRAUD_ALERT_NOT_FOUND', `Fraud alert with ID ${id} not found`);
    }

    if (alert.status !== PrismaFraudAlertStatus.NEW) {
      throw new BusinessRuleError(
        'FRAUD_ALERT_INVALID_TRANSITION',
        `Alert can only be investigated when in NEW status. Current status: ${alert.status}`,
      );
    }

    const updated = await this.prisma.fraudAlert.update({
      where: { id },
      data: { status: PrismaFraudAlertStatus.INVESTIGATED },
    });

    this.logger.log(`Fraud alert investigated: ${id}`);
    return this.toResponseDto(updated);
  }

  // ---------------------------------------------------------------------------
  // Resolve alert (RESOLVED or FALSE_POSITIVE)
  // ---------------------------------------------------------------------------
  async resolve(
    id: string,
    dto: ResolveAlertDto,
    resolvedById: string,
  ): Promise<FraudAlertResponseDto> {
    const alert = await this.prisma.fraudAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundError('FRAUD_ALERT_NOT_FOUND', `Fraud alert with ID ${id} not found`);
    }

    const resolvableStatuses: PrismaFraudAlertStatus[] = [
      PrismaFraudAlertStatus.NEW,
      PrismaFraudAlertStatus.INVESTIGATED,
    ];
    if (!resolvableStatuses.includes(alert.status)) {
      throw new BusinessRuleError(
        'FRAUD_ALERT_ALREADY_RESOLVED',
        `Alert is already in terminal status: ${alert.status}`,
      );
    }

    const updated = await this.prisma.fraudAlert.update({
      where: { id },
      data: {
        status: dto.status as unknown as PrismaFraudAlertStatus,
        adminComment: dto.adminComment,
        resolvedBy: resolvedById,
      },
    });

    this.logger.log(`Fraud alert resolved (${dto.status}): ${id} by ${resolvedById}`);
    return this.toResponseDto(updated);
  }

  // ---------------------------------------------------------------------------
  // Private mapper
  // ---------------------------------------------------------------------------
  private toResponseDto(
    alert: {
      id: string;
      alertType: string;
      actorType: string;
      actorId: string;
      severity: PrismaFraudAlertSeverity;
      details: unknown;
      status: PrismaFraudAlertStatus;
      adminComment: string | null;
      resolvedBy: string | null;
      ruleId: string | null;
      metricValue: { toNumber(): number } | null;
      thresholdValue: { toNumber(): number } | null;
      actionTaken: string | null;
      autoSuspensionId: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ): FraudAlertResponseDto {
    return {
      id: alert.id,
      alertType: alert.alertType,
      actorType: alert.actorType,
      actorId: alert.actorId,
      severity: alert.severity as unknown as SharedFraudAlertSeverity,
      details: alert.details as Record<string, unknown>,
      status: alert.status as unknown as SharedFraudAlertStatus,
      adminComment: alert.adminComment ?? undefined,
      resolvedBy: alert.resolvedBy ?? undefined,
      ruleId: alert.ruleId ?? undefined,
      metricValue: alert.metricValue !== null ? Number(alert.metricValue) : undefined,
      thresholdValue: alert.thresholdValue !== null ? Number(alert.thresholdValue) : undefined,
      actionTaken: alert.actionTaken ?? undefined,
      autoSuspensionId: alert.autoSuspensionId ?? undefined,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
