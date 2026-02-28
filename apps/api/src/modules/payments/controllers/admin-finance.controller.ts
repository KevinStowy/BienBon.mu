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
  Param,
  Body,
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
@Controller('api/admin/finance')
export class AdminFinanceController {
  constructor(
    private readonly paymentService: PaymentOrchestratorService,
    private readonly commissionService: CommissionService,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // Commission configuration
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
}
