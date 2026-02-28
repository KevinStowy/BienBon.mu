// =============================================================================
// Peach Payments — result code mapper
// =============================================================================
// Maps Peach result codes to our internal payment status.
// ADR-005: payment abstraction
// =============================================================================

import { PaymentStatus } from '@bienbon/shared-types';
import type { PeachResultCategory } from './peach-payments.types';

/**
 * Peach result code ranges:
 * - 000.000.000 / 000.100.1xx — Approved
 * - 000.200.xxx                — Pending (async)
 * - 000.300.xxx                — Forwarded / redirect
 * - 800.100.xxx                — Soft decline (user-retryable)
 * - 800.200.xxx                — Fraud rejection
 * - 800.300.xxx / 800.400.xxx  — Hard decline
 * - 900.xxx.xxx                — System / communication error
 */
export function classifyPeachResultCode(code: string): PeachResultCategory {
  if (!code) return 'UNKNOWN';

  const prefix = code.substring(0, 3);

  if (prefix === '000') {
    const mid = code.substring(4, 7);
    if (mid === '000' || mid === '100') return 'SUCCESS';
    if (mid === '200') return 'PENDING';
    return 'SUCCESS';
  }

  if (prefix === '800') {
    const mid = code.substring(4, 7);
    if (mid === '100') return 'SOFT_DECLINE';
    if (mid === '200') return 'FRAUD';
    if (mid === '300' || mid === '400') return 'HARD_DECLINE';
  }

  if (prefix === '900') {
    return 'COMMUNICATION';
  }

  return 'UNKNOWN';
}

/**
 * Maps a Peach result code to our internal PaymentStatus.
 */
export function mapPeachCodeToPaymentStatus(code: string): PaymentStatus {
  const category = classifyPeachResultCode(code);

  switch (category) {
    case 'SUCCESS':
      return PaymentStatus.SUCCEEDED;
    case 'PENDING':
      return PaymentStatus.PROCESSING;
    case 'SOFT_DECLINE':
    case 'HARD_DECLINE':
    case 'FRAUD':
    case 'COMMUNICATION':
    case 'UNKNOWN':
    default:
      return PaymentStatus.FAILED;
  }
}

/**
 * Returns true if the Peach result code indicates success.
 */
export function isPeachSuccess(code: string): boolean {
  return classifyPeachResultCode(code) === 'SUCCESS';
}

/**
 * Returns true if the result is recoverable (soft decline, communication error).
 */
export function isPeachRetryable(code: string): boolean {
  const category = classifyPeachResultCode(code);
  return category === 'SOFT_DECLINE' || category === 'COMMUNICATION';
}
