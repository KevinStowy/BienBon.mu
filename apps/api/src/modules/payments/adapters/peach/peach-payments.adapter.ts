// =============================================================================
// MockPeachPaymentsAdapter — simulates Peach Payments API responses
// =============================================================================
// IMPORTANT: This is a mock adapter. No real API calls are made.
// It will be replaced by the real PeachPaymentsAdapter once API keys are available.
// ADR-005: Payment abstraction via port pattern
// ADR-006: PCI DSS compliance
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import type {
  PeachPreAuthRequest,
  PeachCaptureRequest,
  PeachRefundRequest,
  PeachVoidRequest,
  PeachPaymentResponse,
} from './peach-payments.types';
import { randomUUID } from 'crypto';

/**
 * Configuration to simulate specific failure scenarios in tests.
 * The real adapter will not expose this.
 */
export interface MockPeachConfig {
  /** Force all operations to fail */
  forceFailure?: boolean;
  /** Force all operations to return PENDING */
  forcePending?: boolean;
  /** Simulated latency in ms */
  simulatedLatencyMs?: number;
}

@Injectable()
export class MockPeachPaymentsAdapter extends PaymentGatewayPort {
  private readonly logger = new Logger(MockPeachPaymentsAdapter.name);

  private config: MockPeachConfig = {};

  /**
   * Configure mock behavior for testing.
   */
  setMockConfig(config: MockPeachConfig): void {
    this.config = config;
  }

  async preAuthorize(params: PeachPreAuthRequest): Promise<PeachPaymentResponse> {
    this.logger.debug(
      `[MOCK] Pre-authorizing ${params.amount} ${params.currency} ` +
      `for merchant tx ${params.merchantTransactionId}`,
    );

    await this.simulateLatency();

    if (this.config.forceFailure) {
      return this.buildFailureResponse(params.amount, params.currency, 'PA');
    }

    if (this.config.forcePending) {
      return this.buildPendingResponse(params.amount, params.currency, 'PA');
    }

    const peachTxId = this.generatePeachTransactionId();

    return {
      id: peachTxId,
      result: {
        code: '000.100.110',
        description: 'Request successfully processed in Merchant in Integrator Test Mode',
      },
      paymentType: 'PA',
      amount: params.amount.toFixed(2),
      currency: params.currency,
      timestamp: new Date().toISOString(),
      merchantTransactionId: params.merchantTransactionId,
    };
  }

  async capture(params: PeachCaptureRequest): Promise<PeachPaymentResponse> {
    this.logger.debug(
      `[MOCK] Capturing ${params.amount} ${params.currency} ` +
      `for pre-auth ${params.preAuthId}`,
    );

    await this.simulateLatency();

    if (this.config.forceFailure) {
      return this.buildFailureResponse(params.amount, params.currency, 'CP');
    }

    if (this.config.forcePending) {
      return this.buildPendingResponse(params.amount, params.currency, 'CP');
    }

    const peachTxId = this.generatePeachTransactionId();

    return {
      id: peachTxId,
      result: {
        code: '000.100.110',
        description: 'Request successfully processed in Merchant in Integrator Test Mode',
      },
      paymentType: 'CP',
      amount: params.amount.toFixed(2),
      currency: params.currency,
      timestamp: new Date().toISOString(),
    };
  }

  async refund(params: PeachRefundRequest): Promise<PeachPaymentResponse> {
    this.logger.debug(
      `[MOCK] Refunding ${params.amount} ${params.currency} ` +
      `for transaction ${params.transactionId}`,
    );

    await this.simulateLatency();

    if (this.config.forceFailure) {
      return this.buildFailureResponse(params.amount, params.currency, 'RF');
    }

    const peachTxId = this.generatePeachTransactionId();

    return {
      id: peachTxId,
      result: {
        code: '000.100.110',
        description: 'Request successfully processed in Merchant in Integrator Test Mode',
      },
      paymentType: 'RF',
      amount: params.amount.toFixed(2),
      currency: params.currency,
      timestamp: new Date().toISOString(),
    };
  }

  async reverse(params: PeachVoidRequest): Promise<PeachPaymentResponse> {
    this.logger.debug(
      `[MOCK] Voiding pre-auth ${params.preAuthId}`,
    );

    await this.simulateLatency();

    if (this.config.forceFailure) {
      return this.buildFailureResponse(0, 'MUR', 'RV');
    }

    const peachTxId = this.generatePeachTransactionId();

    return {
      id: peachTxId,
      result: {
        code: '000.100.110',
        description: 'Request successfully processed in Merchant in Integrator Test Mode',
      },
      paymentType: 'RV',
      amount: '0.00',
      currency: 'MUR',
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Generates a realistic Peach transaction ID format.
   * Real Peach IDs look like: 8ac7a4a185f0f13a0185f47d9ee41234
   */
  private generatePeachTransactionId(): string {
    const raw = randomUUID().replace(/-/g, '');
    return `8ac7a4a1${raw.substring(0, 24)}`;
  }

  private buildFailureResponse(
    amount: number,
    currency: string,
    paymentType: 'PA' | 'CP' | 'RF' | 'RV' | 'DB',
  ): PeachPaymentResponse {
    return {
      id: this.generatePeachTransactionId(),
      result: {
        code: '800.100.153',
        description: 'Transaction declined (Low credit)',
      },
      paymentType,
      amount: amount.toFixed(2),
      currency,
      timestamp: new Date().toISOString(),
    };
  }

  private buildPendingResponse(
    amount: number,
    currency: string,
    paymentType: 'PA' | 'CP' | 'RF' | 'RV' | 'DB',
  ): PeachPaymentResponse {
    return {
      id: this.generatePeachTransactionId(),
      result: {
        code: '000.200.000',
        description: 'Transaction pending',
      },
      paymentType,
      amount: amount.toFixed(2),
      currency,
      timestamp: new Date().toISOString(),
    };
  }

  private async simulateLatency(): Promise<void> {
    const latency = this.config.simulatedLatencyMs ?? 0;
    if (latency > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, latency));
    }
  }
}
