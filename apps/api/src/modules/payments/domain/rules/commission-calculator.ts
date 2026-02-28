// =============================================================================
// Commission Calculator — pure functions (no side effects)
// =============================================================================
// ADR-007: Commission computation
// ADR-027: SOLID — pure functions are maximally testable
// =============================================================================

export interface CommissionResult {
  /** Gross commission amount (in MUR) */
  commissionAmount: number;
  /** Partner net payout (in MUR) = price - commissionAmount */
  netPartnerAmount: number;
  /** True if the fee minimum was applied (commission was floored) */
  feeMinimumApplied: boolean;
  /** The effective commission rate actually applied */
  effectiveRate: number;
}

/**
 * Calculates the commission and partner net amount for a basket sale.
 *
 * Rules (ADR-007):
 * 1. Commission = price * commissionRate
 * 2. If commission < feeMinimum → apply feeMinimum instead
 * 3. Commission is NEVER allowed to exceed the full price
 *    (partner net amount is always >= 0)
 *
 * @param price - The basket selling price in MUR
 * @param commissionRate - Commission rate as a decimal (e.g., 0.25 for 25%)
 * @param feeMinimum - Minimum commission amount in MUR (e.g., 50)
 */
export function calculateCommission(
  price: number,
  commissionRate: number,
  feeMinimum: number,
): CommissionResult {
  if (price <= 0) {
    throw new Error(`Invalid price: ${price}. Price must be positive.`);
  }
  if (commissionRate < 0 || commissionRate > 1) {
    throw new Error(`Invalid commission rate: ${commissionRate}. Must be between 0 and 1.`);
  }
  if (feeMinimum < 0) {
    throw new Error(`Invalid fee minimum: ${feeMinimum}. Must be non-negative.`);
  }

  const calculated = round2(price * commissionRate);
  const effective = Math.max(calculated, feeMinimum);
  // Commission can never exceed price (partner always gets at least Rs 0)
  const capped = Math.min(effective, price);
  const netPartnerAmount = round2(price - capped);
  const feeMinimumApplied = capped > calculated;
  const effectiveRate = price > 0 ? capped / price : 0;

  return {
    commissionAmount: capped,
    netPartnerAmount,
    feeMinimumApplied,
    effectiveRate: round4(effectiveRate),
  };
}

/**
 * Calculates the proportional commission refund for a partial or full refund.
 *
 * When refunding, we reverse the commission proportionally.
 * This ensures the platform adjusts revenue by the correct share.
 *
 * @param originalAmount - The original captured amount
 * @param originalCommission - The original commission charged
 * @param refundAmount - The amount being refunded
 */
export function calculateRefundSplit(
  originalAmount: number,
  originalCommission: number,
  originalPartnerNet: number,
  refundAmount: number,
): { commissionRefund: number; partnerRefund: number } {
  if (refundAmount > originalAmount) {
    throw new Error(
      `Refund amount (${refundAmount}) cannot exceed original amount (${originalAmount})`,
    );
  }

  const ratio = originalAmount > 0 ? refundAmount / originalAmount : 0;
  const commissionRefund = round2(originalCommission * ratio);
  const partnerRefund = round2(originalPartnerNet * ratio);

  return { commissionRefund, partnerRefund };
}

// ---------------------------------------------------------------------------
// Rounding utilities
// ---------------------------------------------------------------------------

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
