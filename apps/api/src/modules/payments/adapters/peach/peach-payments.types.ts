// =============================================================================
// Peach Payments API — Request / Response type definitions
// =============================================================================
// These types model the Peach Payments REST API v2 contracts.
// Used ONLY by the peach adapter layer — never leaked into the domain.
// ADR-005: Payment abstraction via port
// ADR-006: PCI DSS — card data never stored on our servers
// =============================================================================

// ---------------------------------------------------------------------------
// Pre-authorization request
// ---------------------------------------------------------------------------

export interface PeachPreAuthRequest {
  /** Amount in MUR (e.g., 199.00) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Tokenized payment method ID returned by Peach JS widget */
  paymentMethodToken: string;
  /** Our internal reference for idempotency */
  merchantTransactionId: string;
  /** Short description shown on card statement */
  descriptor?: string;
  /** Customer email for receipt */
  customerEmail?: string;
  /** Customer phone */
  customerPhone?: string;
}

// ---------------------------------------------------------------------------
// Capture request
// ---------------------------------------------------------------------------

export interface PeachCaptureRequest {
  /** The pre-auth transaction ID from Peach */
  preAuthId: string;
  /** Amount to capture (may differ from pre-auth for partial captures) */
  amount: number;
  currency: string;
}

// ---------------------------------------------------------------------------
// Refund request
// ---------------------------------------------------------------------------

export interface PeachRefundRequest {
  /** The captured transaction ID to refund */
  transactionId: string;
  /** Amount to refund */
  amount: number;
  currency: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Void / Reversal request
// ---------------------------------------------------------------------------

export interface PeachVoidRequest {
  /** The pre-auth transaction ID to void */
  preAuthId: string;
}

// ---------------------------------------------------------------------------
// Peach API response (common shape)
// ---------------------------------------------------------------------------

export interface PeachPaymentResponse {
  /** Peach internal transaction ID */
  id: string;
  /** Peach result code — e.g., "000.100.110" (success), "000.200.000" (pending) */
  result: {
    code: string;
    description: string;
  };
  /** Payment status from Peach */
  paymentType: 'PA' | 'CP' | 'RF' | 'RV' | 'DB';
  /** Amount processed */
  amount: string;
  /** Currency */
  currency: string;
  /** Timestamp */
  timestamp: string;
  /** Merchant transaction ID (echoed back) */
  merchantTransactionId?: string;
  /** Card details (non-sensitive, for display only) */
  card?: {
    bin: string;
    last4Digits: string;
    holder: string;
    expiryMonth: string;
    expiryYear: string;
    brand: string;
  };
  /** Risk scoring details */
  risk?: {
    score: string;
  };
  /** Raw result code for deterministic processing */
  resultCode?: string;
}

// ---------------------------------------------------------------------------
// Result code categories
// ---------------------------------------------------------------------------

/**
 * Peach Payments result code classification.
 * Full list: https://peachpayments.docs.oppwa.com/reference/resultCodes
 */
export type PeachResultCategory =
  | 'SUCCESS'           // 000.000.000, 000.100.110, 000.100.111, 000.100.112
  | 'PENDING'           // 000.200.xxx
  | 'SOFT_DECLINE'      // 800.100.xxx — can retry
  | 'HARD_DECLINE'      // 800.300.xxx, 800.400.xxx — cannot retry
  | 'FRAUD'             // 800.200.xxx
  | 'COMMUNICATION'     // 900.xxx.xxx — gateway errors
  | 'UNKNOWN';
