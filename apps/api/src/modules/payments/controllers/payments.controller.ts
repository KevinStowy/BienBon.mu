// =============================================================================
// PaymentsController — consumer-facing payment endpoints
// =============================================================================
// ADR-004: REST API conventions
// ADR-010: Auth Supabase JWT
// ADR-011: RBAC
// =============================================================================

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  UseGuards,
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PaymentOrchestratorService } from '../application/services/payment-orchestrator.service';
import { AuthorizePaymentDto } from '../dto/authorize-payment.dto';
import {
  AuthorizeResultDto,
  PaymentResponseDto,
} from '../dto/payment-response.dto';
import { PaymentTransactionRepositoryPort } from '../ports/payment-transaction.repository.port';
import { PaymentTransactionNotFoundError } from '../domain/errors/payment-errors';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly paymentService: PaymentOrchestratorService,
    private readonly txRepo: PaymentTransactionRepositoryPort,
  ) {}

  /**
   * POST /api/payments/authorize
   * Pre-authorize a payment for a reservation.
   */
  @Post('authorize')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Pre-authorize a payment',
    description:
      'Creates a hold on the consumer payment method for the given reservation. ' +
      'The hold expires after 5 minutes if not captured. ' +
      'Returns the transaction ID needed for subsequent capture or void.',
  })
  @ApiResponse({ status: 200, type: AuthorizeResultDto, description: 'Authorization result' })
  @ApiResponse({ status: 400, description: 'Payment pre-authorization failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Duplicate idempotency key' })
  async authorizePayment(
    @Body() dto: AuthorizePaymentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AuthorizeResultDto> {
    const result = await this.paymentService.authorizePayment({
      reservationId: dto.reservationId,
      consumerId: user.id,
      partnerId: '', // Will be resolved from reservation context
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      paymentMethodToken: dto.paymentMethodToken,
      idempotencyKey: dto.idempotencyKey,
    });

    return result;
  }

  /**
   * GET /api/payments/:id
   * Get a payment transaction by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get payment transaction by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getPayment(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponseDto> {
    const tx = await this.txRepo.findById(id);
    if (!tx) throw new PaymentTransactionNotFoundError(id);

    return {
      id: tx.id,
      reservationId: tx.reservationId,
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      paymentMethod: tx.paymentMethod,
      providerTxId: tx.providerTxId,
      commissionAmount: tx.commissionAmount,
      partnerNetAmount: tx.partnerNetAmount,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    };
  }

  /**
   * GET /api/payments/reservation/:reservationId
   * Get all transactions for a reservation.
   */
  @Get('reservation/:reservationId')
  @ApiOperation({ summary: 'Get all payment transactions for a reservation' })
  @ApiParam({ name: 'reservationId', format: 'uuid' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async getByReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<PaymentResponseDto[]> {
    const txs = await this.txRepo.findByReservationId(reservationId);

    return txs.map((tx) => ({
      id: tx.id,
      reservationId: tx.reservationId,
      type: tx.type,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      paymentMethod: tx.paymentMethod,
      providerTxId: tx.providerTxId,
      commissionAmount: tx.commissionAmount,
      partnerNetAmount: tx.partnerNetAmount,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    }));
  }
}
