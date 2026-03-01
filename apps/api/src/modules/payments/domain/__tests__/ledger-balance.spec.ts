// =============================================================================
// Ledger Balance — property-based style tests (ADR-007, ADR-023)
// =============================================================================
// Verifies double-entry bookkeeping invariants using looped random values
// (property-based style without an external library, per task spec).
//
// Key invariants:
//   1. For any capture: sum(debits) === sum(credits) per entry
//   2. Commission is always between 0 and price (inclusive)
//   3. Refund amount is always ≤ original payment amount
//   4. commission + netPartnerAmount === price (always)
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  buildCaptureJournal,
  buildRefundJournal,
  buildPayoutJournal,
  buildMobileCapture,
} from '../../domain/rules/ledger-rules';
import {
  calculateCommission,
  calculateRefundSplit,
} from '../../domain/rules/commission-calculator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PARTNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const RESERVATION_ID = '660e8400-e29b-41d4-a716-446655440001';

/** Generate a random integer in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Invariant 1: Double-entry per journal entry — each entry balances itself
// ---------------------------------------------------------------------------

describe('Double-entry invariant: each journal entry has exactly one debit and one credit', () => {
  it('capture journal entries each carry an amount > 0', () => {
    const entries = buildCaptureJournal({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      totalAmount: 500,
      commissionAmount: 125,
      partnerNetAmount: 375,
      currency: 'MUR',
    });

    for (const entry of entries) {
      expect(entry.amount).toBeGreaterThan(0);
      expect(entry.debitAccountCode).toBeTruthy();
      expect(entry.creditAccountCode).toBeTruthy();
      // Debit and credit accounts must differ (no self-transfers)
      expect(entry.debitAccountCode).not.toBe(entry.creditAccountCode);
    }
  });

  it('refund journal entries each have distinct debit and credit accounts', () => {
    const entries = buildRefundJournal({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      refundAmount: 500,
      commissionRefund: 125,
      partnerRefund: 375,
      currency: 'MUR',
    });

    for (const entry of entries) {
      expect(entry.debitAccountCode).not.toBe(entry.creditAccountCode);
    }
  });
});

// ---------------------------------------------------------------------------
// Invariant 2: commission + netPartnerAmount === price (for any valid input)
// ---------------------------------------------------------------------------

describe('Commission invariant: commission + netPartnerAmount always equals price', () => {
  it('holds for the standard 25% rate with minimum fee', () => {
    const prices = [100, 150, 200, 300, 500, 1000, 2500];
    for (const price of prices) {
      const result = calculateCommission(price, 0.25, 50);
      const sum = round2(result.commissionAmount + result.netPartnerAmount);
      expect(sum).toBe(price);
    }
  });

  it('holds for 0% commission (partner gets everything)', () => {
    const result = calculateCommission(500, 0, 0);
    expect(round2(result.commissionAmount + result.netPartnerAmount)).toBe(500);
    expect(result.commissionAmount).toBe(0);
    expect(result.netPartnerAmount).toBe(500);
  });

  it('holds for 100% commission (partner gets nothing)', () => {
    const result = calculateCommission(500, 1.0, 0);
    expect(round2(result.commissionAmount + result.netPartnerAmount)).toBe(500);
    expect(result.netPartnerAmount).toBe(0);
  });

  it('holds across 50 random price/rate combinations', () => {
    for (let i = 0; i < 50; i++) {
      const price = randInt(50, 10000);
      // Random rate: 0%, 10%, 15%, 20%, 25%, 30%
      const rate = [0, 0.1, 0.15, 0.2, 0.25, 0.3][randInt(0, 5)]!;
      const feeMin = randInt(0, 50);

      const result = calculateCommission(price, rate, feeMin);
      const sum = round2(result.commissionAmount + result.netPartnerAmount);

      expect(sum).toBe(price);
    }
  });
});

// ---------------------------------------------------------------------------
// Invariant 3: Commission is always between 0 and price
// ---------------------------------------------------------------------------

describe('Commission boundaries', () => {
  it('commission is always >= 0', () => {
    for (let i = 0; i < 30; i++) {
      const price = randInt(10, 5000);
      const rate = randInt(0, 100) / 100;
      const feeMin = randInt(0, 100);

      if (rate > 1) continue; // Skip invalid rates (over 100%)
      const result = calculateCommission(price, Math.min(rate, 1), feeMin);
      expect(result.commissionAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it('commission is always <= price (never takes more than the basket price)', () => {
    for (let i = 0; i < 30; i++) {
      const price = randInt(10, 5000);
      const rate = [0, 0.1, 0.25, 0.5, 1.0][randInt(0, 4)]!;
      const feeMin = randInt(0, 200);

      const result = calculateCommission(price, rate, feeMin);
      expect(result.commissionAmount).toBeLessThanOrEqual(price);
    }
  });

  it('netPartnerAmount is always >= 0', () => {
    for (let i = 0; i < 30; i++) {
      const price = randInt(10, 5000);
      const rate = [0, 0.1, 0.25, 0.5, 1.0][randInt(0, 4)]!;
      const feeMin = randInt(0, 200);

      const result = calculateCommission(price, rate, feeMin);
      expect(result.netPartnerAmount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Invariant 4: Refund amount never exceeds original payment amount
// ---------------------------------------------------------------------------

describe('Refund invariant: refund <= original payment', () => {
  it('full refund equals original amount', () => {
    const { commissionRefund, partnerRefund } = calculateRefundSplit(500, 125, 375, 500);
    const totalRefund = round2(commissionRefund + partnerRefund);
    expect(totalRefund).toBe(500);
  });

  it('partial refund is proportionally split and sum <= original', () => {
    const prices = [200, 500, 1000];
    const refundRatios = [0.25, 0.5, 0.75];

    for (const price of prices) {
      const commission = round2(price * 0.25);
      const netPartner = round2(price - commission);

      for (const ratio of refundRatios) {
        const refundAmount = round2(price * ratio);
        const { commissionRefund, partnerRefund } = calculateRefundSplit(
          price,
          commission,
          netPartner,
          refundAmount,
        );

        const totalRefund = round2(commissionRefund + partnerRefund);
        // Total refund split should equal the refund amount (within rounding tolerance)
        expect(Math.abs(totalRefund - refundAmount)).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('throws when refund exceeds original amount', () => {
    expect(() => calculateRefundSplit(500, 125, 375, 501)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Invariant 5: Capture journal — commission entry + partner entry amounts sum
//              to totalAmount (no leakage)
// ---------------------------------------------------------------------------

describe('Capture journal sum invariant', () => {
  it('commission entry amount + partner_credit entry amount equals total captured amount', () => {
    const totalAmount = 800;
    const commissionAmount = 200;
    const partnerNetAmount = 600;

    const entries = buildCaptureJournal({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      totalAmount,
      commissionAmount,
      partnerNetAmount,
      currency: 'MUR',
    });

    const totalInEntries = entries.reduce((sum, e) => sum + e.amount, 0);
    expect(totalInEntries).toBe(totalAmount);
  });

  it('mobile capture journal amounts also sum to total', () => {
    const totalAmount = 600;
    const commissionAmount = 150;
    const partnerNetAmount = 450;

    const entries = buildMobileCapture({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      totalAmount,
      commissionAmount,
      partnerNetAmount,
      currency: 'MUR',
    });

    const totalInEntries = entries.reduce((sum, e) => sum + e.amount, 0);
    expect(totalInEntries).toBe(totalAmount);
  });

  it('holds across random commission splits', () => {
    for (let i = 0; i < 20; i++) {
      const totalAmount = randInt(100, 5000);
      const commissionRate = [0.1, 0.15, 0.2, 0.25][randInt(0, 3)]!;
      const commissionAmount = round2(totalAmount * commissionRate);
      const partnerNetAmount = round2(totalAmount - commissionAmount);

      const entries = buildCaptureJournal({
        partnerId: PARTNER_ID,
        reservationId: RESERVATION_ID,
        totalAmount,
        commissionAmount,
        partnerNetAmount,
        currency: 'MUR',
      });

      const totalInEntries = round2(entries.reduce((sum, e) => sum + e.amount, 0));
      expect(totalInEntries).toBe(totalAmount);
    }
  });
});

// ---------------------------------------------------------------------------
// Payout journal
// ---------------------------------------------------------------------------

describe('buildPayoutJournal', () => {
  it('payout amount flows from partner payable to payout transit', () => {
    const entries = buildPayoutJournal({
      partnerId: PARTNER_ID,
      payoutAmount: 3000,
      currency: 'MUR',
      statementId: 'stmt-march-001',
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]!.amount).toBe(3000);
    expect(entries[0]!.debitAccountCode).toContain(PARTNER_ID);
    expect(entries[0]!.creditAccountCode).toBeDefined();
  });
});
