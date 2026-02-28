// =============================================================================
// Shared Error Codes and DomainError base type
// =============================================================================
// Convention:
// - Error codes follow the pattern: BC_ENTITY_ERROR (e.g., CATALOG_BASKET_NOT_FOUND)
// - DomainError is a typed error envelope for cross-BC error communication
// - HTTP status codes are NOT part of domain errors — mapping is in the API layer
// =============================================================================

// =============================================================================
// Error Code Enum
// =============================================================================

export enum ErrorCode {
  // --- Generic ---
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',

  // --- Auth ---
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_ROLE = 'AUTH_INSUFFICIENT_ROLE',
  AUTH_ACCOUNT_SUSPENDED = 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_ACCOUNT_BANNED = 'AUTH_ACCOUNT_BANNED',

  // --- Catalog ---
  CATALOG_BASKET_NOT_FOUND = 'CATALOG_BASKET_NOT_FOUND',
  CATALOG_BASKET_NOT_AVAILABLE = 'CATALOG_BASKET_NOT_AVAILABLE',
  CATALOG_BASKET_SOLD_OUT = 'CATALOG_BASKET_SOLD_OUT',
  CATALOG_BASKET_INVALID_PRICE = 'CATALOG_BASKET_INVALID_PRICE',
  CATALOG_BASKET_INVALID_PICKUP_WINDOW = 'CATALOG_BASKET_INVALID_PICKUP_WINDOW',
  CATALOG_BASKET_INVALID_STATUS_TRANSITION = 'CATALOG_BASKET_INVALID_STATUS_TRANSITION',
  CATALOG_INSUFFICIENT_STOCK = 'CATALOG_INSUFFICIENT_STOCK',

  // --- Ordering ---
  ORDERING_RESERVATION_NOT_FOUND = 'ORDERING_RESERVATION_NOT_FOUND',
  ORDERING_RESERVATION_ALREADY_EXISTS = 'ORDERING_RESERVATION_ALREADY_EXISTS',
  ORDERING_RESERVATION_EXPIRED = 'ORDERING_RESERVATION_EXPIRED',
  ORDERING_RESERVATION_INVALID_STATUS_TRANSITION = 'ORDERING_RESERVATION_INVALID_STATUS_TRANSITION',
  ORDERING_RESERVATION_CANCEL_TOO_LATE = 'ORDERING_RESERVATION_CANCEL_TOO_LATE',
  ORDERING_PICKUP_INVALID_CODE = 'ORDERING_PICKUP_INVALID_CODE',
  ORDERING_PICKUP_NOT_READY = 'ORDERING_PICKUP_NOT_READY',
  ORDERING_PICKUP_ALREADY_COMPLETED = 'ORDERING_PICKUP_ALREADY_COMPLETED',

  // --- Payment ---
  PAYMENT_PRE_AUTH_FAILED = 'PAYMENT_PRE_AUTH_FAILED',
  PAYMENT_CAPTURE_FAILED = 'PAYMENT_CAPTURE_FAILED',
  PAYMENT_REFUND_FAILED = 'PAYMENT_REFUND_FAILED',
  PAYMENT_REFUND_EXCEEDS_CAPTURED = 'PAYMENT_REFUND_EXCEEDS_CAPTURED',
  PAYMENT_REVERSAL_FAILED = 'PAYMENT_REVERSAL_FAILED',
  PAYMENT_METHOD_NOT_SUPPORTED = 'PAYMENT_METHOD_NOT_SUPPORTED',
  PAYMENT_TRANSACTION_NOT_FOUND = 'PAYMENT_TRANSACTION_NOT_FOUND',

  // --- Partner ---
  PARTNER_NOT_FOUND = 'PARTNER_NOT_FOUND',
  PARTNER_NOT_ACTIVE = 'PARTNER_NOT_ACTIVE',
  PARTNER_STORE_NOT_FOUND = 'PARTNER_STORE_NOT_FOUND',
  PARTNER_STORE_NOT_ACTIVE = 'PARTNER_STORE_NOT_ACTIVE',
  PARTNER_INVALID_STATUS_TRANSITION = 'PARTNER_INVALID_STATUS_TRANSITION',
  PARTNER_MODIFICATION_PENDING = 'PARTNER_MODIFICATION_PENDING',

  // --- Claims ---
  CLAIMS_NOT_FOUND = 'CLAIMS_NOT_FOUND',
  CLAIMS_WINDOW_EXPIRED = 'CLAIMS_WINDOW_EXPIRED',
  CLAIMS_ALREADY_EXISTS = 'CLAIMS_ALREADY_EXISTS',
  CLAIMS_INVALID_STATUS_TRANSITION = 'CLAIMS_INVALID_STATUS_TRANSITION',

  // --- Review ---
  REVIEW_NOT_FOUND = 'REVIEW_NOT_FOUND',
  REVIEW_WINDOW_EXPIRED = 'REVIEW_WINDOW_EXPIRED',
  REVIEW_ALREADY_EXISTS = 'REVIEW_ALREADY_EXISTS',
  REVIEW_NOT_EDITABLE = 'REVIEW_NOT_EDITABLE',
  REVIEW_INVALID_RATING = 'REVIEW_INVALID_RATING',

  // --- Notification ---
  NOTIFICATION_DELIVERY_FAILED = 'NOTIFICATION_DELIVERY_FAILED',
  NOTIFICATION_INVALID_CHANNEL = 'NOTIFICATION_INVALID_CHANNEL',

  // --- Fraud ---
  FRAUD_ALERT_NOT_FOUND = 'FRAUD_ALERT_NOT_FOUND',
  FRAUD_ACTOR_SUSPENDED = 'FRAUD_ACTOR_SUSPENDED',
}

// =============================================================================
// DomainError — structured error envelope for cross-BC communication
// =============================================================================

export interface DomainError {
  /** Machine-readable error code */
  code: ErrorCode;
  /** Human-readable error message (English) */
  message: string;
  /** Optional details for debugging (field errors, constraint violations, etc.) */
  details?: Record<string, unknown>;
}

// =============================================================================
// DomainException — throwable error class for use in application services
// =============================================================================

export class DomainException extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'DomainException';
    this.code = code;
    this.details = details;
  }

  toError(): DomainError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
