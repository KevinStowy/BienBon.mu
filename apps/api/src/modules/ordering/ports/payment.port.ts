/**
 * Result of a pre-authorization request.
 */
export interface PreAuthResult {
  /** External transaction ID returned by the payment provider */
  transactionId: string;
  /** Status of the pre-authorization */
  status: 'success' | 'failure';
  /** Provider-specific reference */
  providerRef?: string;
}

/**
 * Outbound port for payment operations.
 * The domain layer calls this interface — the actual payment provider
 * (Stripe, PayHere, etc.) is injected as the driven adapter.
 *
 * ADR-005: Payment abstraction via port
 * ADR-006: PCI DSS compliance — card data never touches our domain layer
 */
export abstract class PaymentPort {
  /**
   * Pre-authorizes (holds) a payment amount without capturing it.
   * Used when creating a reservation to hold funds during the 5-minute window.
   *
   * @param amount - Amount in MUR (Mauritius Rupee), in smallest unit (cents)
   * @param paymentMethodToken - Tokenized payment method reference
   * @returns PreAuthResult with the transaction ID
   */
  abstract preAuthorize(
    amount: number,
    paymentMethodToken: string,
  ): Promise<PreAuthResult>;

  /**
   * Captures a previously pre-authorized payment.
   * Called when PAYMENT_SUCCESS event is triggered.
   *
   * @param transactionId - The transaction ID from preAuthorize
   */
  abstract capture(transactionId: string): Promise<void>;

  /**
   * Refunds a captured payment.
   * Called when a reservation is cancelled after payment capture.
   *
   * @param transactionId - The transaction ID to refund
   */
  abstract refund(transactionId: string): Promise<void>;

  /**
   * Reverses (voids) a pre-authorized payment that was not captured.
   * Called when a reservation expires or is cancelled before payment.
   *
   * @param transactionId - The transaction ID to reverse
   */
  abstract reverse(transactionId: string): Promise<void>;
}
