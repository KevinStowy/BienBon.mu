// =============================================================================
// Payment domain errors
// =============================================================================
// ADR-024: Domain errors extend the shared DomainError hierarchy
// =============================================================================

import {
  BusinessRuleError,
  NotFoundError,
  ConflictError,
} from '../../../../shared/errors/domain-error';

// ---------------------------------------------------------------------------
// Not Found
// ---------------------------------------------------------------------------

export class PaymentTransactionNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('PAYMENT_TRANSACTION_NOT_FOUND', `Payment transaction '${id}' not found`);
  }
}

// ---------------------------------------------------------------------------
// Business rule violations
// ---------------------------------------------------------------------------

export class PaymentPreAuthFailedError extends BusinessRuleError {
  constructor(reason: string) {
    super('PAYMENT_PRE_AUTH_FAILED', `Pre-authorization failed: ${reason}`);
  }
}

export class PaymentCaptureFailedError extends BusinessRuleError {
  constructor(reason: string) {
    super('PAYMENT_CAPTURE_FAILED', `Payment capture failed: ${reason}`);
  }
}

export class PaymentRefundFailedError extends BusinessRuleError {
  constructor(reason: string) {
    super('PAYMENT_REFUND_FAILED', `Payment refund failed: ${reason}`);
  }
}

export class PaymentReversalFailedError extends BusinessRuleError {
  constructor(reason: string) {
    super('PAYMENT_REVERSAL_FAILED', `Payment reversal failed: ${reason}`);
  }
}

export class RefundExceedsCapturedError extends BusinessRuleError {
  constructor(refundAmount: number, capturedAmount: number) {
    super(
      'PAYMENT_REFUND_EXCEEDS_CAPTURED',
      `Refund amount (${refundAmount}) exceeds captured amount (${capturedAmount})`,
    );
  }
}

export class PaymentMethodNotSupportedError extends BusinessRuleError {
  constructor(method: string) {
    super('PAYMENT_METHOD_NOT_SUPPORTED', `Payment method '${method}' is not supported`);
  }
}

export class DuplicateIdempotencyKeyError extends ConflictError {
  constructor(key: string) {
    super(
      'PAYMENT_DUPLICATE_IDEMPOTENCY_KEY',
      `A payment transaction with idempotency key '${key}' already exists`,
    );
  }
}

export class LedgerImbalanceError extends Error {
  constructor(journalId: string, debitTotal: number, creditTotal: number) {
    super(
      `Journal '${journalId}' is imbalanced: debits=${debitTotal} credits=${creditTotal}`,
    );
    this.name = 'LedgerImbalanceError';
  }
}

export class WebhookSignatureError extends BusinessRuleError {
  constructor() {
    super('PAYMENT_WEBHOOK_INVALID_SIGNATURE', 'Invalid webhook HMAC signature');
  }
}
