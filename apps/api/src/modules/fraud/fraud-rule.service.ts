import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundError, ConflictError } from '../../shared/errors/domain-error';
import {
  FraudAlertSeverity as SharedFraudAlertSeverity,
} from '@bienbon/shared-types';
import {
  FraudAlertSeverity as PrismaFraudAlertSeverity,
} from '../../generated/prisma/client';
import type { CreateFraudRuleDto } from './dto/create-fraud-rule.dto';
import type { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';
import type { ListFraudRulesQueryDto } from './dto/list-fraud-rules-query.dto';
import type { FraudRuleResponseDto } from './dto/fraud-rule-response.dto';
import type { PaginatedResponseDto } from '../../shared/dto/pagination.dto';
import { PaginatedResponseDto as PaginatedResponse } from '../../shared/dto/pagination.dto';

/**
 * Service for managing fraud detection rules.
 * Provides CRUD operations for admins to configure the fraud detection engine.
 */
@Injectable()
export class FraudRuleService {
  private readonly logger = new Logger(FraudRuleService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // List rules (paginated + filterable)
  // ---------------------------------------------------------------------------
  async listRules(
    query: ListFraudRulesQueryDto,
  ): Promise<PaginatedResponseDto<FraudRuleResponseDto>> {
    const where = {
      ...(query.actorType !== undefined && { actorType: query.actorType }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };

    const [rules, total] = await Promise.all([
      this.prisma.fraudRule.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: query.sort_order ?? 'desc' },
      }),
      this.prisma.fraudRule.count({ where }),
    ]);

    return PaginatedResponse.create(rules.map(this.toResponseDto), total, query);
  }

  // ---------------------------------------------------------------------------
  // Get single rule
  // ---------------------------------------------------------------------------
  async getRule(id: string): Promise<FraudRuleResponseDto> {
    const rule = await this.prisma.fraudRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundError('FRAUD_RULE_NOT_FOUND', `Fraud rule with ID ${id} not found`);
    }
    return this.toResponseDto(rule);
  }

  // ---------------------------------------------------------------------------
  // Create rule
  // ---------------------------------------------------------------------------
  async createRule(dto: CreateFraudRuleDto): Promise<FraudRuleResponseDto> {
    const existing = await this.prisma.fraudRule.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictError(
        'FRAUD_RULE_SLUG_CONFLICT',
        `A fraud rule with slug "${dto.slug}" already exists`,
      );
    }

    const rule = await this.prisma.fraudRule.create({
      data: {
        slug: dto.slug,
        nameFr: dto.nameFr,
        nameEn: dto.nameEn,
        descriptionFr: dto.descriptionFr,
        descriptionEn: dto.descriptionEn,
        actorType: dto.actorType,
        metric: dto.metric,
        operator: dto.operator,
        threshold: dto.threshold,
        windowDays: dto.windowDays,
        windowHours: dto.windowHours,
        windowMinutes: dto.windowMinutes,
        minSampleSize: dto.minSampleSize ?? 1,
        action: dto.action,
        severity: dto.severity as unknown as PrismaFraudAlertSeverity,
        isActive: dto.isActive ?? true,
        cooldownHours: dto.cooldownHours ?? 24,
      },
    });

    this.logger.log(`Fraud rule created: ${rule.slug} (${rule.id})`);
    return this.toResponseDto(rule);
  }

  // ---------------------------------------------------------------------------
  // Update rule
  // ---------------------------------------------------------------------------
  async updateRule(id: string, dto: UpdateFraudRuleDto): Promise<FraudRuleResponseDto> {
    const existing = await this.prisma.fraudRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FRAUD_RULE_NOT_FOUND', `Fraud rule with ID ${id} not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugConflict = await this.prisma.fraudRule.findUnique({
        where: { slug: dto.slug },
      });
      if (slugConflict) {
        throw new ConflictError(
          'FRAUD_RULE_SLUG_CONFLICT',
          `A fraud rule with slug "${dto.slug}" already exists`,
        );
      }
    }

    const rule = await this.prisma.fraudRule.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.nameFr !== undefined && { nameFr: dto.nameFr }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.descriptionFr !== undefined && { descriptionFr: dto.descriptionFr }),
        ...(dto.descriptionEn !== undefined && { descriptionEn: dto.descriptionEn }),
        ...(dto.actorType !== undefined && { actorType: dto.actorType }),
        ...(dto.metric !== undefined && { metric: dto.metric }),
        ...(dto.operator !== undefined && { operator: dto.operator }),
        ...(dto.threshold !== undefined && { threshold: dto.threshold }),
        ...(dto.windowDays !== undefined && { windowDays: dto.windowDays }),
        ...(dto.windowHours !== undefined && { windowHours: dto.windowHours }),
        ...(dto.windowMinutes !== undefined && { windowMinutes: dto.windowMinutes }),
        ...(dto.minSampleSize !== undefined && { minSampleSize: dto.minSampleSize }),
        ...(dto.action !== undefined && { action: dto.action }),
        ...(dto.severity !== undefined && {
          severity: dto.severity as unknown as PrismaFraudAlertSeverity,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.cooldownHours !== undefined && { cooldownHours: dto.cooldownHours }),
      },
    });

    this.logger.log(`Fraud rule updated: ${rule.slug} (${rule.id})`);
    return this.toResponseDto(rule);
  }

  // ---------------------------------------------------------------------------
  // Toggle isActive
  // ---------------------------------------------------------------------------
  async toggleActive(id: string): Promise<FraudRuleResponseDto> {
    const existing = await this.prisma.fraudRule.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('FRAUD_RULE_NOT_FOUND', `Fraud rule with ID ${id} not found`);
    }

    const rule = await this.prisma.fraudRule.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    this.logger.log(`Fraud rule toggled: ${rule.slug} isActive=${rule.isActive}`);
    return this.toResponseDto(rule);
  }

  // ---------------------------------------------------------------------------
  // Private mapper
  // ---------------------------------------------------------------------------
  private toResponseDto(
    rule: {
      id: string;
      slug: string;
      nameFr: string;
      nameEn: string | null;
      descriptionFr: string | null;
      descriptionEn: string | null;
      actorType: string;
      metric: string;
      operator: string;
      threshold: { toNumber(): number };
      windowDays: number | null;
      windowHours: number | null;
      windowMinutes: number | null;
      minSampleSize: number;
      action: string;
      severity: PrismaFraudAlertSeverity;
      isActive: boolean;
      cooldownHours: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ): FraudRuleResponseDto {
    return {
      id: rule.id,
      slug: rule.slug,
      nameFr: rule.nameFr,
      nameEn: rule.nameEn ?? undefined,
      descriptionFr: rule.descriptionFr ?? undefined,
      descriptionEn: rule.descriptionEn ?? undefined,
      actorType: rule.actorType,
      metric: rule.metric,
      operator: rule.operator,
      threshold: Number(rule.threshold),
      windowDays: rule.windowDays ?? undefined,
      windowHours: rule.windowHours ?? undefined,
      windowMinutes: rule.windowMinutes ?? undefined,
      minSampleSize: rule.minSampleSize,
      action: rule.action,
      severity: rule.severity as unknown as SharedFraudAlertSeverity,
      isActive: rule.isActive,
      cooldownHours: rule.cooldownHours,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
