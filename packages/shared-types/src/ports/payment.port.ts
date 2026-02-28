// =============================================================================
// IPaymentService — Port for Payment bounded context (BC-6)
// =============================================================================
// Used by: Ordering (pre-auth, capture, reversal), Claims (refund)
// Communication type: synchronous call (critical path)
// See: ADR-024 section 3.2 (BC-6) and ADR-005/007 (payment/ledger)
// =============================================================================

import type {
  CaptureResult,
  PartnerBalanceDto,
  PreAuthorizeParams,
  PreAuthorizeResult,
  RefundResult,
} from '../dto/index.js';

export interface IPaymentService {
  /**
   * Pre-authorize a payment amount for a reservation.
   * Creates a hold on the consumer's payment method.
   * The hold expires after 5 minutes if not captured.
   */
  preAuthorize(params: PreAuthorizeParams): Promise<PreAuthorizeResult>;

  /**
   * Capture a previously pre-authorized payment.
   * Triggers ledger double-entry: debit GATEWAY, credit REVENUE + PARTNER.
   * Commission is calculated and recorded.
   */
  capture(orderId: string): Promise<CaptureResult>;

  /**
   * Reverse (void) a pre-authorized payment that was never captured.
   * Used when a reservation expires or is cancelled before pickup.
   */
  reversal(orderId: string): Promise<void>;

  /**
   * Refund a captured payment (full or partial).
   * Used by Claims when resolving with refund.
   * Constraint: refund amount cannot exceed captured amount.
   */
  refund(orderId: string, amount: number): Promise<RefundResult>;

  /**
   * Get a partner's current balance (available + pending).
   * Used by Partner dashboard.
   */
  getBalance(partnerId: string): Promise<PartnerBalanceDto>;
}

/** Injection token for IPaymentService */
export const PAYMENT_SERVICE = Symbol('IPaymentService');
