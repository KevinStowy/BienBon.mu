// =============================================================================
// AdminFinanceController — admin endpoints for commission config and payouts
// =============================================================================
// ADR-011: RBAC — ADMIN and SUPER_ADMIN only
// ADR-007: Commission management
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { Role } from '@bienbon/shared-types';
import { PaymentOrchestratorService } from '../application/services/payment-orchestrator.service';
import { CommissionService } from '../application/services/commission.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateCommissionConfigDto,
  CommissionConfigResponseDto,
} from '../dto/commission-config.dto';
import {
  PartnerBalanceResponseDto,
  CaptureResultDto,
  RefundResultDto,
} from '../dto/payment-response.dto';
import { RefundRequestDto } from '../dto/refund-request.dto';
import { CapturePaymentDto } from '../dto/capture-payment.dto';

@ApiTags('admin-finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/v1/admin/finance')
export class AdminFinanceController {
  constructor(
    private readonly paymentService: PaymentOrchestratorService,
    private readonly commissionService: CommissionService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Unified commission config (frontend uses singular /commission-config)
  // ---------------------------------------------------------------------------

  @Get('commission-config')
  @ApiOperation({ summary: 'Get global commission configuration' })
  @ApiResponse({ status: 200, description: 'Commission config returned' })
  async getGlobalCommissionConfig(): Promise<{
    globalRate: number;
    feeMinimum: number;
    minDiscountRatio: number;
    lastModifiedAt: string;
    lastModifiedBy: string;
  }> {
    const config = await this.prisma.commissionConfig.findFirst({
      where: { scope: 'GLOBAL', effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!config) {
      return {
        globalRate: 0.15,
        feeMinimum: 50,
        minDiscountRatio: 0.3,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: 'system',
      };
    }

    return {
      globalRate: Number(config.commissionRate),
      feeMinimum: Number(config.feeMinimum),
      minDiscountRatio: 0.3,
      lastModifiedAt: config.createdAt.toISOString(),
      lastModifiedBy: config.createdBy,
    };
  }

  @Put('commission-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update global commission configuration' })
  @ApiResponse({ status: 200, description: 'Commission config updated' })
  async updateGlobalCommissionConfig(
    @Body() body: { globalRate?: number; feeMinimum?: number; minDiscountRatio?: number },
    @CurrentUser() user: AuthUser,
  ): Promise<{
    globalRate: number;
    feeMinimum: number;
    minDiscountRatio: number;
    lastModifiedAt: string;
    lastModifiedBy: string;
  }> {
    const existing = await this.prisma.commissionConfig.findFirst({
      where: { scope: 'GLOBAL', effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (existing) {
      await this.prisma.commissionConfig.update({
        where: { id: existing.id },
        data: { effectiveTo: new Date() },
      });
    }

    const config = await this.prisma.commissionConfig.create({
      data: {
        scope: 'GLOBAL',
        commissionRate: body.globalRate ?? (existing ? Number(existing.commissionRate) : 0.15),
        feeMinimum: body.feeMinimum ?? (existing ? Number(existing.feeMinimum) : 50),
        effectiveFrom: new Date(),
        createdBy: user.id,
      },
    });

    return {
      globalRate: Number(config.commissionRate),
      feeMinimum: Number(config.feeMinimum),
      minDiscountRatio: body.minDiscountRatio ?? 0.3,
      lastModifiedAt: config.createdAt.toISOString(),
      lastModifiedBy: config.createdBy,
    };
  }

  // ---------------------------------------------------------------------------
  // Payouts (frontend route, wraps payout-statements)
  // ---------------------------------------------------------------------------

  @Get('payouts')
  @ApiOperation({ summary: 'List payout statements' })
  @ApiResponse({ status: 200, description: 'Payout statements returned' })
  async listPayouts(
    @Query('partnerId') partnerId?: string,
    @Query('period') _period?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: unknown[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (partnerId) where['partnerId'] = partnerId;

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    const [statements, total] = await Promise.all([
      this.prisma.payoutStatement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: { lines: true },
      }),
      this.prisma.payoutStatement.count({ where }),
    ]);

    const data = statements.map((s) => ({
      id: s.id,
      partnerId: s.partnerId,
      partnerName: s.statementNumber,
      partnerAddress: '',
      partnerBrn: '',
      period: `${s.periodStart.toISOString().split('T')[0]} - ${s.periodEnd.toISOString().split('T')[0]}`,
      transactions: s.lines.map((l) => ({
        id: l.id,
        date: l.transactionDate.toISOString(),
        basketRef: l.basketTitle,
        quantity: l.quantity,
        saleAmount: Number(l.grossAmount),
        commissionRate: Number(l.commissionRate),
        commissionAmount: Number(l.commissionAmount),
        feeMinApplied: l.feeMinimumApplied,
      })),
      totalGrossSales: Number(s.totalSalesGross),
      totalCommission: Number(s.totalCommission),
      netPayout: Number(s.netPayoutAmount),
      status: this.mapPayoutStatus(s.status),
      paidAt: s.payoutExecutedAt?.toISOString() ?? null,
      scheduledPayDate: s.payoutDate?.toISOString() ?? s.periodEnd.toISOString(),
    }));

    return { data, total };
  }

  @Post('payouts/generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate payout statements for a month' })
  @ApiResponse({ status: 200, description: 'Payouts generated' })
  async generatePayouts(
    @Body() body: { month: string },
  ): Promise<{ success: boolean; generatedCount: number }> {
    // Stub — real generation requires complex ledger calculations
    void body;
    return { success: true, generatedCount: 0 };
  }

  @Post('payouts/:id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a payout as paid' })
  @ApiResponse({ status: 200, description: 'Payout marked as paid' })
  async markPayoutPaid(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.payoutStatement.update({
      where: { id },
      data: {
        status: 'PAID',
        payoutExecutedAt: new Date(),
      },
    });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Revenue analytics
  // ---------------------------------------------------------------------------

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue overview for a period' })
  @ApiResponse({ status: 200, description: 'Revenue overview returned' })
  async getRevenueOverview(
    @Query('period') period?: string,
  ): Promise<{
    totalRevenue: number;
    totalCommission: number;
    avgMargin: number;
    totalTransactions: number;
    avgTransactionAmount: number;
    totalRefunds: number;
  }> {
    const { start, end } = this.getRevenuePeriodBounds(period ?? 'this_month');

    const [captureAgg, refundAgg] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: {
          type: 'CAPTURE',
          status: 'SUCCEEDED',
          createdAt: { gte: start, lt: end },
        },
        _sum: { amount: true, commissionAmount: true },
        _count: true,
        _avg: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          type: 'REFUND',
          status: 'SUCCEEDED',
          createdAt: { gte: start, lt: end },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = Number(captureAgg._sum.amount ?? 0);
    const totalCommission = Number(captureAgg._sum.commissionAmount ?? 0);
    const totalRefunds = Number(refundAgg._sum.amount ?? 0);
    const avgTransactionAmount = Number(captureAgg._avg.amount ?? 0);
    const avgMargin =
      totalRevenue > 0
        ? Math.round((totalCommission / totalRevenue) * 100 * 100) / 100
        : 0;

    return {
      totalRevenue,
      totalCommission,
      avgMargin,
      totalTransactions: captureAgg._count,
      avgTransactionAmount: Math.round(avgTransactionAmount * 100) / 100,
      totalRefunds,
    };
  }

  @Get('revenue/by-partner')
  @ApiOperation({ summary: 'Get revenue grouped by partner' })
  @ApiResponse({ status: 200, description: 'Revenue by partner returned' })
  async getRevenueByPartner(
    @Query('period') period?: string,
  ): Promise<unknown[]> {
    const { start, end } = this.getRevenuePeriodBounds(period ?? 'this_month');

    const grouped = await this.prisma.paymentTransaction.groupBy({
      by: ['partnerId'],
      where: {
        type: 'CAPTURE',
        status: 'SUCCEEDED',
        createdAt: { gte: start, lt: end },
        partnerId: { not: null },
      },
      _sum: { amount: true, commissionAmount: true },
      _count: true,
    });

    // Batch-fetch partner names
    const partnerIds = grouped
      .map((g) => g.partnerId)
      .filter((id): id is string => id !== null);

    const profiles =
      partnerIds.length > 0
        ? await this.prisma.partnerProfile.findMany({
            where: { userId: { in: partnerIds } },
            include: {
              user: { select: { firstName: true, lastName: true } },
              partnerStores: {
                where: { storeRole: 'OWNER' },
                include: { store: { select: { name: true } } },
                take: 1,
              },
            },
          })
        : [];

    const nameMap = new Map(
      profiles.map((p) => [
        p.userId,
        p.partnerStores[0]?.store.name ??
          `${p.user.firstName} ${p.user.lastName}`,
      ]),
    );

    return grouped.map((g) => ({
      partnerId: g.partnerId ?? 'unknown',
      partnerName: nameMap.get(g.partnerId ?? '') ?? 'Unknown Partner',
      revenue: Number(g._sum.amount ?? 0),
      transactions: g._count,
      commission: Number(g._sum.commissionAmount ?? 0),
    }));
  }

  // ---------------------------------------------------------------------------
  // Commission configuration (plural routes — existing)
  // ---------------------------------------------------------------------------

  /**
   * POST /api/admin/finance/commission-configs
   * Create a new commission configuration.
   */
  @Post('commission-configs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create commission configuration',
    description: 'Creates a new commission rate config for a scope (global or partner-specific).',
  })
  @ApiResponse({ status: 201, type: CommissionConfigResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  async createCommissionConfig(
    @Body() dto: CreateCommissionConfigDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CommissionConfigResponseDto> {
    const config = await this.prisma.commissionConfig.create({
      data: {
        scope: dto.scope,
        partnerId: dto.partnerId ?? null,
        basketTypeId: dto.basketTypeId ?? null,
        commissionRate: dto.commissionRate,
        feeMinimum: dto.feeMinimum,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        createdBy: user.id,
        notes: dto.notes ?? null,
      },
    });

    return {
      id: config.id,
      scope: config.scope,
      partnerId: config.partnerId,
      basketTypeId: config.basketTypeId,
      commissionRate: Number(config.commissionRate),
      feeMinimum: Number(config.feeMinimum),
      effectiveFrom: config.effectiveFrom.toISOString(),
      effectiveTo: config.effectiveTo?.toISOString() ?? null,
      notes: config.notes,
      createdAt: config.createdAt.toISOString(),
    };
  }

  /**
   * GET /api/admin/finance/commission-configs
   * List all commission configurations.
   */
  @Get('commission-configs')
  @ApiOperation({ summary: 'List commission configurations' })
  @ApiResponse({ status: 200, type: [CommissionConfigResponseDto] })
  async listCommissionConfigs(): Promise<CommissionConfigResponseDto[]> {
    const configs = await this.prisma.commissionConfig.findMany({
      orderBy: { effectiveFrom: 'desc' },
    });

    return configs.map((c) => ({
      id: c.id,
      scope: c.scope,
      partnerId: c.partnerId,
      basketTypeId: c.basketTypeId,
      commissionRate: Number(c.commissionRate),
      feeMinimum: Number(c.feeMinimum),
      effectiveFrom: c.effectiveFrom.toISOString(),
      effectiveTo: c.effectiveTo?.toISOString() ?? null,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * GET /api/admin/finance/commission-configs/partner/:partnerId
   * Get the effective commission config for a specific partner.
   */
  @Get('commission-configs/partner/:partnerId')
  @ApiOperation({ summary: 'Get effective commission config for a partner' })
  @ApiParam({ name: 'partnerId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Returns the effective config with calculated preview',
  })
  async getPartnerCommissionConfig(
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ): Promise<{
    commissionRate: number;
    feeMinimum: number;
    configId: string | null;
  }> {
    return this.commissionService.resolveCommissionConfig(partnerId);
  }

  // ---------------------------------------------------------------------------
  // Partner balance
  // ---------------------------------------------------------------------------

  /**
   * GET /api/admin/finance/balances/:partnerId
   * Get the current ledger balance for a partner.
   */
  @Get('balances/:partnerId')
  @ApiOperation({ summary: 'Get partner ledger balance' })
  @ApiParam({ name: 'partnerId', format: 'uuid' })
  @ApiResponse({ status: 200, type: PartnerBalanceResponseDto })
  async getPartnerBalance(
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
  ): Promise<PartnerBalanceResponseDto> {
    return this.paymentService.getBalance(partnerId);
  }

  // ---------------------------------------------------------------------------
  // Manual capture / refund (for admin resolution)
  // ---------------------------------------------------------------------------

  /**
   * POST /api/admin/finance/capture
   * Manually capture a pre-authorized transaction.
   */
  @Post('capture')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually capture a pre-authorized payment',
    description: 'Admin-triggered capture. Normally done automatically by the system.',
  })
  @ApiResponse({ status: 200, type: CaptureResultDto })
  async capturePayment(@Body() dto: CapturePaymentDto): Promise<CaptureResultDto> {
    return this.paymentService.captureByTransactionId({
      transactionId: dto.transactionId,
      actorId: 'admin',
    });
  }

  /**
   * POST /api/admin/finance/refund
   * Issue a refund for a captured transaction.
   */
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Issue a refund',
    description: 'Admin-triggered refund. Used when resolving claims with monetary compensation.',
  })
  @ApiResponse({ status: 200, type: RefundResultDto })
  @ApiResponse({ status: 400, description: 'Refund amount exceeds captured amount' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async refundPayment(@Body() dto: RefundRequestDto): Promise<RefundResultDto> {
    return this.paymentService.refundByTransactionId({
      transactionId: dto.transactionId,
      amount: dto.amount,
      reason: dto.reason,
      actorId: 'admin',
    });
  }

  // ---------------------------------------------------------------------------
  // Payout statements
  // ---------------------------------------------------------------------------

  /**
   * GET /api/admin/finance/payout-statements
   * List payout statements with optional partner filter.
   */
  @Get('payout-statements')
  @ApiOperation({ summary: 'List payout statements' })
  @ApiResponse({ status: 200, description: 'List of payout statements' })
  async listPayoutStatements(): Promise<unknown[]> {
    const statements = await this.prisma.payoutStatement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return statements.map((s) => ({
      id: s.id,
      statementNumber: s.statementNumber,
      partnerId: s.partnerId,
      periodStart: s.periodStart.toISOString(),
      periodEnd: s.periodEnd.toISOString(),
      netPayoutAmount: Number(s.netPayoutAmount),
      totalCommission: Number(s.totalCommission),
      status: s.status,
      payoutDate: s.payoutDate?.toISOString() ?? null,
      generatedAt: s.generatedAt.toISOString(),
    }));
  }

  /**
   * GET /api/admin/finance/payout-statements/:id
   * Get a payout statement with line items.
   */
  @Get('payout-statements/:id')
  @ApiOperation({ summary: 'Get payout statement with line items' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Payout statement detail' })
  async getPayoutStatement(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const statement = await this.prisma.payoutStatement.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!statement) {
      return null;
    }

    return {
      id: statement.id,
      statementNumber: statement.statementNumber,
      partnerId: statement.partnerId,
      periodStart: statement.periodStart.toISOString(),
      periodEnd: statement.periodEnd.toISOString(),
      totalSalesGross: Number(statement.totalSalesGross),
      totalCommission: Number(statement.totalCommission),
      totalVatOnCommission: Number(statement.totalVatOnCommission),
      totalRefunds: Number(statement.totalRefunds),
      netPayoutAmount: Number(statement.netPayoutAmount),
      commissionRate: Number(statement.commissionRate),
      feeMinimum: Number(statement.feeMinimum),
      feeMinimumAppliedCount: statement.feeMinimumAppliedCount,
      status: statement.status,
      payoutDate: statement.payoutDate?.toISOString() ?? null,
      generatedAt: statement.generatedAt.toISOString(),
      lines: statement.lines.map((l) => ({
        id: l.id,
        basketTitle: l.basketTitle,
        quantity: l.quantity,
        grossAmount: Number(l.grossAmount),
        commissionAmount: Number(l.commissionAmount),
        netAmount: Number(l.netAmount),
        feeMinimumApplied: l.feeMinimumApplied,
        transactionDate: l.transactionDate.toISOString(),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapPayoutStatus(
    status: string,
  ): 'PENDING' | 'PAID' | 'ERROR' {
    if (status === 'PAID') return 'PAID';
    if (status === 'ERROR') return 'ERROR';
    return 'PENDING';
  }

  private getRevenuePeriodBounds(period: string): {
    start: Date;
    end: Date;
  } {
    const now = new Date();

    switch (period) {
      case 'today': {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      }
      case 'yesterday': {
        const end = new Date(now);
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - 1);
        return { start, end };
      }
      case 'this_week': {
        const start = new Date(now);
        const dow = start.getDay();
        start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      }
      case 'last_week': {
        const thisWeekStart = new Date(now);
        const dow = thisWeekStart.getDay();
        thisWeekStart.setDate(
          thisWeekStart.getDate() - (dow === 0 ? 6 : dow - 1),
        );
        thisWeekStart.setHours(0, 0, 0, 0);
        const start = new Date(thisWeekStart);
        start.setDate(start.getDate() - 7);
        return { start, end: thisWeekStart };
      }
      case 'last_month': {
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start, end };
      }
      case 'this_quarter': {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), qMonth, 1);
        return { start, end: now };
      }
      case 'this_year': {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start, end: now };
      }
      case 'this_month':
      default: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now };
      }
    }
  }
}
