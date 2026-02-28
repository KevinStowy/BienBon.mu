// =============================================================================
// PaymentOrchestratorService — main orchestration service
// =============================================================================
// Implements IPaymentService (shared-types port) for cross-BC consumption.
// ADR-005: Payment abstraction
// ADR-007: Ledger double-entry
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import { PaymentTransactionRepositoryPort } from '../../ports/payment-transaction.repository.port';
import { LedgerService } from './ledger.service';
import { CommissionService } from './commission.service';
import {
  PaymentTransactionNotFoundError,
  PaymentPreAuthFailedError,
  PaymentCaptureFailedError,
  PaymentRefundFailedError,
  PaymentReversalFailedError,
  RefundExceedsCapturedError,
  DuplicateIdempotencyKeyError,
} from '../../domain/errors/payment-errors';
import { isPeachSuccess } from '../../adapters/peach/peach-payments.mapper';
import { calculateRefundSplit } from '../../domain/rules/commission-calculator';
import { PaymentStatus, PaymentType, PAYMENT_SERVICE } from '@bienbon/shared-types';
import { DOMAIN_EVENTS } from '@bienbon/shared-types';
import type { IPaymentService } from '@bienbon/shared-types';
import type {
  PreAuthorizeParams,
  PreAuthorizeResult,
  CaptureResult,
  RefundResult,
  PartnerBalanceDto,
} from '@bienbon/shared-types';
import type { AuthorizePaymentCommand } from '../commands/authorize-payment.command';
import type { CapturePaymentCommand } from '../commands/capture-payment.command';
import type { RefundPaymentCommand } from '../commands/refund-payment.command';
import type { PaymentCapturedEvent, PaymentRefundedEvent } from '@bienbon/shared-types';

@Injectable()
export class PaymentOrchestratorService implements IPaymentService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);

  constructor(
    private readonly gatewayPort: PaymentGatewayPort,
    private readonly txRepo: PaymentTransactionRepositoryPort,
    private readonly ledgerService: LedgerService,
    private readonly commissionService: CommissionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // IPaymentService implementation (for cross-BC use)
  // ---------------------------------------------------------------------------

  /**
   * Pre-authorize a payment for a reservation.
   * Creates a hold on the consumer's payment method.
   */
  async preAuthorize(params: PreAuthorizeParams): Promise<PreAuthorizeResult> {
    const txId = randomUUID();

    // Create transaction record in PENDING state
    await this.txRepo.create({
      id: txId,
      reservationId: params.orderId,
      type: PaymentType.PRE_AUTH,
      status: PaymentStatus.PENDING,
      amount: params.amount,
      currency: params.currency,
      paymentMethod: params.paymentMethod,
      consumerId: params.consumerId,
    });

    try {
      const response = await this.gatewayPort.preAuthorize({
        amount: params.amount,
        currency: params.currency,
        paymentMethodToken: `mock-token-${params.consumerId}`,
        merchantTransactionId: txId,
      });

      const success = isPeachSuccess(response.result.code);
      const newStatus = success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

      await this.txRepo.update(txId, {
        status: newStatus,
        providerTxId: response.id,
        providerStatus: response.result.code,
      });

      return {
        success,
        transactionId: txId,
        status: newStatus,
        providerTxId: response.id,
        errorCode: success ? undefined : response.result.code,
        errorMessage: success ? undefined : response.result.description,
      };
    } catch (error) {
      await this.txRepo.update(txId, { status: PaymentStatus.FAILED });
      throw new PaymentPreAuthFailedError(
        error instanceof Error ? error.message : 'Unknown gateway error',
      );
    }
  }

  /**
   * Capture a previously pre-authorized payment.
   * Calculates commission, posts ledger journal, emits PaymentCaptured event.
   */
  async capture(orderId: string): Promise<CaptureResult> {
    // Find the pre-auth transaction for this reservation
    const txs = await this.txRepo.findByReservationId(orderId);
    const preAuthTx = txs.find(
      (t) => t.type === PaymentType.PRE_AUTH && t.status === PaymentStatus.SUCCEEDED,
    );

    if (!preAuthTx) {
      throw new PaymentTransactionNotFoundError(`pre-auth for reservation ${orderId}`);
    }

    const captureTxId = randomUUID();

    // Create capture transaction in PENDING
    await this.txRepo.create({
      id: captureTxId,
      reservationId: orderId,
      type: PaymentType.CAPTURE,
      status: PaymentStatus.PENDING,
      amount: preAuthTx.amount,
      currency: preAuthTx.currency,
      paymentMethod: preAuthTx.paymentMethod,
      consumerId: preAuthTx.consumerId ?? undefined,
      partnerId: preAuthTx.partnerId ?? undefined,
      parentTxId: preAuthTx.id,
    });

    try {
      const response = await this.gatewayPort.capture({
        preAuthId: preAuthTx.providerTxId ?? preAuthTx.id,
        amount: preAuthTx.amount,
        currency: preAuthTx.currency,
      });

      const success = isPeachSuccess(response.result.code);

      if (!success) {
        await this.txRepo.update(captureTxId, {
          status: PaymentStatus.FAILED,
          providerTxId: response.id,
          providerStatus: response.result.code,
        });

        return {
          success: false,
          transactionId: captureTxId,
          status: PaymentStatus.FAILED,
          capturedAmount: 0,
          errorCode: response.result.code,
          errorMessage: response.result.description,
        };
      }

      // Calculate commission if partnerId is known
      let commissionAmount = 0;
      let partnerNetAmount = preAuthTx.amount;
      let feeMinimumApplied = false;
      let effectiveRate = 0;

      if (preAuthTx.partnerId) {
        const commResult = await this.commissionService.calculateForPartner(
          preAuthTx.partnerId,
          preAuthTx.amount,
        );
        commissionAmount = commResult.commissionAmount;
        partnerNetAmount = commResult.netPartnerAmount;
        feeMinimumApplied = commResult.feeMinimumApplied;
        effectiveRate = commResult.commissionRate;
      }

      // Update capture transaction
      await this.txRepo.update(captureTxId, {
        status: PaymentStatus.SUCCEEDED,
        providerTxId: response.id,
        providerStatus: response.result.code,
        commissionRate: effectiveRate,
        commissionAmount,
        partnerNetAmount,
        feeMinimumApplied,
      });

      // Post ledger journal
      if (preAuthTx.partnerId) {
        await this.ledgerService.postCaptureJournal({
          partnerId: preAuthTx.partnerId,
          reservationId: orderId,
          totalAmount: preAuthTx.amount,
          commissionAmount,
          partnerNetAmount,
          currency: preAuthTx.currency,
          paymentMethod: preAuthTx.paymentMethod,
          transactionId: captureTxId,
        });
      }

      // Emit PaymentCaptured domain event
      const event: PaymentCapturedEvent = {
        eventId: randomUUID(),
        eventType: DOMAIN_EVENTS.PAYMENT_CAPTURED,
        occurredAt: new Date().toISOString(),
        aggregateId: captureTxId,
        aggregateType: 'PaymentTransaction',
        payload: {
          transactionId: captureTxId,
          reservationId: orderId,
          consumerId: preAuthTx.consumerId ?? '',
          partnerId: preAuthTx.partnerId ?? '',
          amount: preAuthTx.amount,
          currency: preAuthTx.currency,
          commissionAmount,
          netPartnerAmount: partnerNetAmount,
        },
      };

      this.eventEmitter.emit(DOMAIN_EVENTS.PAYMENT_CAPTURED, event);

      this.logger.log(
        `Payment captured: tx=${captureTxId} reservation=${orderId} ` +
        `amount=${preAuthTx.amount} commission=${commissionAmount}`,
      );

      return {
        success: true,
        transactionId: captureTxId,
        status: PaymentStatus.SUCCEEDED,
        capturedAmount: preAuthTx.amount,
      };
    } catch (error) {
      if (error instanceof PaymentCaptureFailedError) throw error;
      await this.txRepo.update(captureTxId, { status: PaymentStatus.FAILED });
      throw new PaymentCaptureFailedError(
        error instanceof Error ? error.message : 'Unknown gateway error',
      );
    }
  }

  /**
   * Reverse (void) a pre-authorized payment that was never captured.
   */
  async reversal(orderId: string): Promise<void> {
    const txs = await this.txRepo.findByReservationId(orderId);
    const preAuthTx = txs.find(
      (t) => t.type === PaymentType.PRE_AUTH && t.status === PaymentStatus.SUCCEEDED,
    );

    if (!preAuthTx) {
      this.logger.warn(
        `No pre-auth found for reservation ${orderId} — skipping reversal`,
      );
      return;
    }

    try {
      const response = await this.gatewayPort.reverse({
        preAuthId: preAuthTx.providerTxId ?? preAuthTx.id,
      });

      const success = isPeachSuccess(response.result.code);
      const newStatus = success ? PaymentStatus.CANCELLED : PaymentStatus.FAILED;

      await this.txRepo.update(preAuthTx.id, {
        status: newStatus,
        providerStatus: response.result.code,
      });

      if (!success) {
        throw new PaymentReversalFailedError(response.result.description);
      }

      this.logger.log(`Pre-auth reversed: tx=${preAuthTx.id} reservation=${orderId}`);
    } catch (error) {
      if (error instanceof PaymentReversalFailedError) throw error;
      throw new PaymentReversalFailedError(
        error instanceof Error ? error.message : 'Unknown gateway error',
      );
    }
  }

  /**
   * Refund a captured payment (full or partial).
   */
  async refund(orderId: string, amount: number): Promise<RefundResult> {
    const captureTx = await this.txRepo.findCapturedByReservationId(orderId);

    if (!captureTx) {
      throw new PaymentTransactionNotFoundError(`capture for reservation ${orderId}`);
    }

    if (amount > captureTx.amount) {
      throw new RefundExceedsCapturedError(amount, captureTx.amount);
    }

    const refundTxId = randomUUID();

    await this.txRepo.create({
      id: refundTxId,
      reservationId: orderId,
      type: PaymentType.REFUND,
      status: PaymentStatus.PENDING,
      amount,
      currency: captureTx.currency,
      paymentMethod: captureTx.paymentMethod,
      consumerId: captureTx.consumerId ?? undefined,
      partnerId: captureTx.partnerId ?? undefined,
      parentTxId: captureTx.id,
    });

    try {
      const response = await this.gatewayPort.refund({
        transactionId: captureTx.providerTxId ?? captureTx.id,
        amount,
        currency: captureTx.currency,
      });

      const success = isPeachSuccess(response.result.code);

      if (!success) {
        await this.txRepo.update(refundTxId, {
          status: PaymentStatus.FAILED,
          providerTxId: response.id,
          providerStatus: response.result.code,
        });

        return {
          success: false,
          transactionId: refundTxId,
          status: PaymentStatus.FAILED,
          refundedAmount: 0,
          errorCode: response.result.code,
          errorMessage: response.result.description,
        };
      }

      await this.txRepo.update(refundTxId, {
        status: PaymentStatus.SUCCEEDED,
        providerTxId: response.id,
        providerStatus: response.result.code,
      });

      // Post refund journal
      if (captureTx.partnerId && captureTx.commissionAmount !== null && captureTx.partnerNetAmount !== null) {
        const { commissionRefund, partnerRefund } = calculateRefundSplit(
          captureTx.amount,
          captureTx.commissionAmount,
          captureTx.partnerNetAmount,
          amount,
        );

        await this.ledgerService.postRefundJournal({
          partnerId: captureTx.partnerId,
          reservationId: orderId,
          refundAmount: amount,
          commissionRefund,
          partnerRefund,
          currency: captureTx.currency,
          transactionId: refundTxId,
        });
      }

      // Emit PaymentRefunded domain event
      const event: PaymentRefundedEvent = {
        eventId: randomUUID(),
        eventType: DOMAIN_EVENTS.PAYMENT_REFUNDED,
        occurredAt: new Date().toISOString(),
        aggregateId: refundTxId,
        aggregateType: 'PaymentTransaction',
        payload: {
          transactionId: refundTxId,
          reservationId: orderId,
          consumerId: captureTx.consumerId ?? '',
          refundedAmount: amount,
          currency: captureTx.currency,
          reason: 'refund',
        },
      };

      this.eventEmitter.emit(DOMAIN_EVENTS.PAYMENT_REFUNDED, event);

      this.logger.log(
        `Payment refunded: tx=${refundTxId} reservation=${orderId} amount=${amount}`,
      );

      return {
        success: true,
        transactionId: refundTxId,
        status: PaymentStatus.SUCCEEDED,
        refundedAmount: amount,
      };
    } catch (error) {
      if (error instanceof RefundExceedsCapturedError) throw error;
      if (error instanceof PaymentRefundFailedError) throw error;
      await this.txRepo.update(refundTxId, { status: PaymentStatus.FAILED });
      throw new PaymentRefundFailedError(
        error instanceof Error ? error.message : 'Unknown gateway error',
      );
    }
  }

  /**
   * Get a partner's current balance (available + pending).
   */
  async getBalance(partnerId: string): Promise<PartnerBalanceDto> {
    const balance = await this.ledgerService.getPartnerBalance(partnerId);

    return {
      partnerId,
      availableBalance: Math.max(0, balance.balance),
      pendingBalance: 0, // TODO: differentiate pending vs available via payout status
      currency: 'MUR',
      lastPayoutDate: null,
      lastPayoutAmount: null,
    };
  }

  // ---------------------------------------------------------------------------
  // Extended command handlers (used by controllers)
  // ---------------------------------------------------------------------------

  /**
   * Authorize (pre-auth) via command object — richer than IPaymentService.preAuthorize.
   */
  async authorizePayment(cmd: AuthorizePaymentCommand): Promise<PreAuthorizeResult> {
    // Idempotency check
    if (cmd.idempotencyKey) {
      const existing = await this.txRepo.findByIdempotencyKey(cmd.idempotencyKey);
      if (existing) {
        throw new DuplicateIdempotencyKeyError(cmd.idempotencyKey);
      }
    }

    const txId = randomUUID();

    await this.txRepo.create({
      id: txId,
      reservationId: cmd.reservationId,
      type: PaymentType.PRE_AUTH,
      status: PaymentStatus.PENDING,
      amount: cmd.amount,
      currency: cmd.currency,
      paymentMethod: cmd.paymentMethod,
      consumerId: cmd.consumerId,
      partnerId: cmd.partnerId,
      idempotencyKey: cmd.idempotencyKey,
    });

    try {
      const response = await this.gatewayPort.preAuthorize({
        amount: cmd.amount,
        currency: cmd.currency,
        paymentMethodToken: cmd.paymentMethodToken,
        merchantTransactionId: txId,
      });

      const success = isPeachSuccess(response.result.code);
      const newStatus = success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

      await this.txRepo.update(txId, {
        status: newStatus,
        providerTxId: response.id,
        providerStatus: response.result.code,
      });

      return {
        success,
        transactionId: txId,
        status: newStatus,
        providerTxId: response.id,
        errorCode: success ? undefined : response.result.code,
        errorMessage: success ? undefined : response.result.description,
      };
    } catch (error) {
      await this.txRepo.update(txId, { status: PaymentStatus.FAILED });
      throw new PaymentPreAuthFailedError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Capture via transaction ID (used by webhook / admin triggers).
   */
  async captureByTransactionId(cmd: CapturePaymentCommand): Promise<CaptureResult> {
    const tx = await this.txRepo.findById(cmd.transactionId);
    if (!tx) throw new PaymentTransactionNotFoundError(cmd.transactionId);

    // Delegate to reservation-level capture
    return this.capture(tx.reservationId);
  }

  /**
   * Refund via transaction ID.
   */
  async refundByTransactionId(cmd: RefundPaymentCommand): Promise<RefundResult> {
    const tx = await this.txRepo.findById(cmd.transactionId);
    if (!tx) throw new PaymentTransactionNotFoundError(cmd.transactionId);

    return this.refund(tx.reservationId, cmd.amount);
  }
}

// Re-export token for injection
export { PAYMENT_SERVICE };
