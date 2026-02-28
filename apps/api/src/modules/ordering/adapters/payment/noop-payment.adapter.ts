import { Injectable, Logger } from '@nestjs/common';
import { PaymentPort, PreAuthResult } from '../../ports/payment.port';

/**
 * Stub payment adapter that always returns success.
 *
 * This is a placeholder until the Payment BC is implemented.
 * ADR-005: Payment is a separate bounded context.
 *
 * Replace this with a real payment adapter (PayHere, Stripe, etc.)
 * once the Payment BC (ordering dependency) is available.
 */
@Injectable()
export class NoopPaymentAdapter extends PaymentPort {
  private readonly logger = new Logger(NoopPaymentAdapter.name);

  async preAuthorize(
    amount: number,
    paymentMethodToken: string,
  ): Promise<PreAuthResult> {
    this.logger.log(
      `[NOOP] Pre-authorizing ${amount} with method ${paymentMethodToken}`,
    );
    return {
      transactionId: `noop-txn-${Date.now()}`,
      status: 'success',
      providerRef: 'noop',
    };
  }

  async capture(transactionId: string): Promise<void> {
    this.logger.log(`[NOOP] Capturing transaction ${transactionId}`);
  }

  async refund(transactionId: string): Promise<void> {
    this.logger.log(`[NOOP] Refunding transaction ${transactionId}`);
  }

  async reverse(transactionId: string): Promise<void> {
    this.logger.log(`[NOOP] Reversing transaction ${transactionId}`);
  }
}
