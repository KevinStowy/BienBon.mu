// =============================================================================
// FraudExtraController — additional fraud endpoints for duplicates & thresholds
// =============================================================================
// Route: /api/v1/admin/fraud
// Handles: /duplicates, /threshold-alerts, /threshold-rules
// Complements FraudAlertController (/alerts), FraudRuleController (/rules),
// FraudSuspensionController (/suspensions) — all under the same /fraud prefix.

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('fraud')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/v1/admin/fraud')
export class FraudExtraController {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Duplicate accounts
  // ---------------------------------------------------------------------------

  @Get('duplicates')
  @ApiOperation({ summary: 'List detected duplicate accounts' })
  @ApiResponse({ status: 200, description: 'Duplicate accounts returned' })
  async listDuplicates(): Promise<{ data: unknown[]; total: number }> {
    // Duplicate account detection engine not yet implemented —
    // return empty set so frontend renders the real (empty) state instead of mocks.
    return { data: [], total: 0 };
  }

  @Post('duplicates/:id/merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge duplicate accounts' })
  @ApiResponse({ status: 200, description: 'Accounts merged' })
  async mergeDuplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { primaryAccountId: string },
  ): Promise<{ success: boolean }> {
    // Stub — merge logic not yet implemented
    void id;
    void body;
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Threshold alerts — derived from FraudAlert where thresholdValue is set
  // ---------------------------------------------------------------------------

  @Get('threshold-alerts')
  @ApiOperation({ summary: 'List threshold-based fraud alerts' })
  @ApiResponse({ status: 200, description: 'Threshold alerts returned' })
  async listThresholdAlerts(): Promise<unknown[]> {
    const alerts = await this.prisma.fraudAlert.findMany({
      where: { thresholdValue: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        rule: {
          select: {
            nameFr: true,
            descriptionFr: true,
            windowMinutes: true,
            windowHours: true,
            windowDays: true,
          },
        },
      },
    });

    return alerts.map((a) => ({
      id: a.id,
      type: a.alertType,
      description: a.rule?.descriptionFr ?? `${a.alertType} alert`,
      currentValue: Number(a.metricValue ?? 0),
      threshold: Number(a.thresholdValue ?? 0),
      period: a.rule
        ? this.formatWindow(a.rule.windowMinutes, a.rule.windowHours, a.rule.windowDays)
        : 'N/A',
      status:
        a.status === 'NEW' || a.status === 'INVESTIGATED'
          ? ('ACTIVE' as const)
          : ('ACKNOWLEDGED' as const),
      acknowledgedBy: a.resolvedBy,
      acknowledgedComment: a.adminComment,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  // ---------------------------------------------------------------------------
  // Threshold rules — mapped from FraudRule
  // ---------------------------------------------------------------------------

  @Get('threshold-rules')
  @ApiOperation({ summary: 'List threshold rules for fraud detection' })
  @ApiResponse({ status: 200, description: 'Threshold rules returned' })
  async listThresholdRules(): Promise<unknown[]> {
    const rules = await this.prisma.fraudRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return rules.map((r) => ({
      id: r.id,
      name: r.nameFr,
      description: r.descriptionFr ?? '',
      type: r.metric,
      thresholdValue: Number(r.threshold),
      windowMinutes: this.toMinutes(r.windowMinutes, r.windowHours, r.windowDays),
      enabled: r.isActive,
      notifyEmail: true,
      notifyPush: true,
    }));
  }

  @Patch('threshold-rules/:id')
  @ApiOperation({ summary: 'Update a threshold rule' })
  @ApiResponse({ status: 200, description: 'Rule updated' })
  async updateThresholdRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      thresholdValue?: number;
      enabled?: boolean;
      windowMinutes?: number;
      name?: string;
      description?: string;
    },
  ): Promise<unknown> {
    const data: Record<string, unknown> = {};
    if (body.thresholdValue !== undefined) data['threshold'] = body.thresholdValue;
    if (body.enabled !== undefined) data['isActive'] = body.enabled;
    if (body.name !== undefined) data['nameFr'] = body.name;
    if (body.description !== undefined) data['descriptionFr'] = body.description;
    if (body.windowMinutes !== undefined) data['windowMinutes'] = body.windowMinutes;

    const updated = await this.prisma.fraudRule.update({
      where: { id },
      data,
    });

    return {
      id: updated.id,
      name: updated.nameFr,
      description: updated.descriptionFr ?? '',
      type: updated.metric,
      thresholdValue: Number(updated.threshold),
      windowMinutes: this.toMinutes(
        updated.windowMinutes,
        updated.windowHours,
        updated.windowDays,
      ),
      enabled: updated.isActive,
      notifyEmail: true,
      notifyPush: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private formatWindow(
    minutes: number | null,
    hours: number | null,
    days: number | null,
  ): string {
    if (days) return `${days} day(s)`;
    if (hours) return `${hours} hour(s)`;
    if (minutes) return `${minutes} minute(s)`;
    return 'N/A';
  }

  private toMinutes(
    minutes: number | null,
    hours: number | null,
    days: number | null,
  ): number {
    return (minutes ?? 0) + (hours ?? 0) * 60 + (days ?? 0) * 1440;
  }
}
