import { describe, it, expect } from 'vitest';
import {
  calculateCommission,
  calculateRefundSplit,
} from '../../domain/rules/commission-calculator';

describe('calculateCommission', () => {
  describe('standard rate (25%)', () => {
    it('returns correct amounts for Rs 200 basket', () => {
      const result = calculateCommission(200, 0.25, 50);
      expect(result.commissionAmount).toBe(50);
      expect(result.netPartnerAmount).toBe(150);
      expect(result.feeMinimumApplied).toBe(false);
    });

    it('applies fee minimum when calculated < feeMinimum', () => {
      // Rs 100 at 25% = Rs 25, but minimum is Rs 50
      const result = calculateCommission(100, 0.25, 50);
      expect(result.commissionAmount).toBe(50);
      expect(result.netPartnerAmount).toBe(50);
      expect(result.feeMinimumApplied).toBe(true);
    });

    it('does not apply fee minimum when calculated >= feeMinimum', () => {
      // Rs 300 at 25% = Rs 75, minimum is Rs 50
      const result = calculateCommission(300, 0.25, 50);
      expect(result.commissionAmount).toBe(75);
      expect(result.netPartnerAmount).toBe(225);
      expect(result.feeMinimumApplied).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('never exceeds price (commission capped at 100%)', () => {
      // Rs 30 at 25% = Rs 7.50, minimum is Rs 50 — but minimum > price
      const result = calculateCommission(30, 0.25, 50);
      expect(result.commissionAmount).toBe(30);
      expect(result.netPartnerAmount).toBe(0);
      expect(result.feeMinimumApplied).toBe(true);
    });

    it('handles 0% commission rate', () => {
      const result = calculateCommission(200, 0, 0);
      expect(result.commissionAmount).toBe(0);
      expect(result.netPartnerAmount).toBe(200);
    });

    it('handles 100% commission rate', () => {
      const result = calculateCommission(200, 1, 0);
      expect(result.commissionAmount).toBe(200);
      expect(result.netPartnerAmount).toBe(0);
    });

    it('rounds amounts to 2 decimal places', () => {
      // Rs 199 at 25% = Rs 49.75
      const result = calculateCommission(199, 0.25, 0);
      expect(result.commissionAmount).toBe(49.75);
      expect(result.netPartnerAmount).toBe(149.25);
    });

    it('throws on negative price', () => {
      expect(() => calculateCommission(-100, 0.25, 50)).toThrow('Invalid price');
    });

    it('throws on invalid commission rate', () => {
      expect(() => calculateCommission(200, 1.5, 50)).toThrow('Invalid commission rate');
      expect(() => calculateCommission(200, -0.1, 50)).toThrow('Invalid commission rate');
    });

    it('throws on negative fee minimum', () => {
      expect(() => calculateCommission(200, 0.25, -10)).toThrow('Invalid fee minimum');
    });
  });

  describe('effective rate', () => {
    it('returns commission/price as effective rate', () => {
      const result = calculateCommission(200, 0.25, 50);
      // 50/200 = 0.25
      expect(result.effectiveRate).toBe(0.25);
    });

    it('returns higher effective rate when fee minimum applied', () => {
      // Rs 100, minimum Rs 50 → effective rate = 50/100 = 0.50
      const result = calculateCommission(100, 0.25, 50);
      expect(result.effectiveRate).toBe(0.5);
    });
  });
});

describe('calculateRefundSplit', () => {
  it('splits full refund proportionally', () => {
    // Original: Rs 200 total, Rs 50 commission, Rs 150 partner
    const { commissionRefund, partnerRefund } = calculateRefundSplit(200, 50, 150, 200);
    expect(commissionRefund).toBe(50);
    expect(partnerRefund).toBe(150);
  });

  it('splits partial refund proportionally', () => {
    // Refund Rs 100 of Rs 200 (50% ratio)
    const { commissionRefund, partnerRefund } = calculateRefundSplit(200, 50, 150, 100);
    expect(commissionRefund).toBe(25); // 50 * 0.5
    expect(partnerRefund).toBe(75);   // 150 * 0.5
  });

  it('throws when refund exceeds original amount', () => {
    expect(() => calculateRefundSplit(200, 50, 150, 300)).toThrow(
      'Refund amount (300) cannot exceed original amount (200)',
    );
  });

  it('handles zero commission gracefully', () => {
    const { commissionRefund, partnerRefund } = calculateRefundSplit(200, 0, 200, 100);
    expect(commissionRefund).toBe(0);
    expect(partnerRefund).toBe(100);
  });
});
