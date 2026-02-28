// =============================================================================
// PaymentGatewayPort — outbound port for payment gateway adapter
// =============================================================================
// ADR-005: Payment provider abstraction
// ADR-006: PCI DSS — card data never enters our domain
// The domain calls this abstract class; the concrete adapter is injected.
// =============================================================================

import type {
  PeachPreAuthRequest,
  PeachCaptureRequest,
  PeachRefundRequest,
  PeachVoidRequest,
  PeachPaymentResponse,
} from '../adapters/peach/peach-payments.types';

export abstract class PaymentGatewayPort {
  /**
   * Pre-authorize (hold) funds on a payment method.
   * Does NOT capture — only creates a hold that expires.
   */
  abstract preAuthorize(params: PeachPreAuthRequest): Promise<PeachPaymentResponse>;

  /**
   * Capture a previously pre-authorized amount.
   * Moves the held funds to the merchant account.
   */
  abstract capture(params: PeachCaptureRequest): Promise<PeachPaymentResponse>;

  /**
   * Refund a captured transaction (full or partial).
   */
  abstract refund(params: PeachRefundRequest): Promise<PeachPaymentResponse>;

  /**
   * Void / reverse a pre-authorized transaction that was never captured.
   */
  abstract reverse(params: PeachVoidRequest): Promise<PeachPaymentResponse>;
}
