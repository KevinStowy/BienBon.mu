import { describe, it, expect } from 'vitest';
import {
  buildCaptureJournal,
  buildMobileCapture,
  buildRefundJournal,
  buildPayoutJournal,
} from '../../domain/rules/ledger-rules';
import { SYSTEM_ACCOUNTS, partnerPayableCode } from '../../domain/entities/ledger-entry.entity';

const PARTNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const RESERVATION_ID = '660e8400-e29b-41d4-a716-446655440000';

describe('buildCaptureJournal', () => {
  it('builds commission and partner credit entries for card payment', () => {
    const entries = buildCaptureJournal({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      totalAmount: 200,
      commissionAmount: 50,
      partnerNetAmount: 150,
      currency: 'MUR',
    });

    expect(entries).toHaveLength(2);

    const commission = entries.find((e) => e.entryType === 'commission');
    expect(commission).toBeDefined();
    expect(commission?.debitAccountCode).toBe(SYSTEM_ACCOUNTS.GATEWAY);
    expect(commission?.creditAccountCode).toBe(SYSTEM_ACCOUNTS.PLATFORM_REVENUE);
    expect(commission?.amount).toBe(50);

    const partnerCredit = entries.find((e) => e.entryType === 'partner_credit');
    expect(partnerCredit).toBeDefined();
    expect(partnerCredit?.debitAccountCode).toBe(SYSTEM_ACCOUNTS.GATEWAY);
    expect(partnerCredit?.creditAccountCode).toBe(partnerPayableCode(PARTNER_ID));
    expect(partnerCredit?.amount).toBe(150);
  });

  it('skips zero-amount entries', () => {
    const entries = buildCaptureJournal({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      totalAmount: 50,
      commissionAmount: 50,
      partnerNetAmount: 0,
      currency: 'MUR',
    });

    // Only commission entry (partnerNetAmount = 0 is skipped)
    expect(entries).toHaveLength(1);
    expect(entries[0]!.entryType).toBe('commission');
  });
});

describe('buildMobileCapture', () => {
  it('uses CONSUMER_HOLDING instead of GATEWAY for mobile money', () => {
    const entries = buildMobileCapture({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      totalAmount: 200,
      commissionAmount: 50,
      partnerNetAmount: 150,
      currency: 'MUR',
    });

    expect(entries).toHaveLength(2);

    for (const entry of entries) {
      expect(entry.debitAccountCode).toBe(SYSTEM_ACCOUNTS.CONSUMER_HOLDING);
    }
  });
});

describe('buildRefundJournal', () => {
  it('builds three-entry refund journal', () => {
    const entries = buildRefundJournal({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      refundAmount: 200,
      commissionRefund: 50,
      partnerRefund: 150,
      currency: 'MUR',
    });

    expect(entries).toHaveLength(3);

    const consumerRefund = entries.find((e) => e.entryType === 'refund_consumer');
    expect(consumerRefund?.debitAccountCode).toBe(SYSTEM_ACCOUNTS.REFUND_PENDING);
    expect(consumerRefund?.creditAccountCode).toBe(SYSTEM_ACCOUNTS.GATEWAY);
    expect(consumerRefund?.amount).toBe(200);

    const commAdj = entries.find((e) => e.entryType === 'refund_commission_adj');
    expect(commAdj?.debitAccountCode).toBe(SYSTEM_ACCOUNTS.PLATFORM_REVENUE_ADJUSTMENT);
    expect(commAdj?.creditAccountCode).toBe(SYSTEM_ACCOUNTS.REFUND_PENDING);
    expect(commAdj?.amount).toBe(50);

    const partnerAdj = entries.find((e) => e.entryType === 'refund_partner_adj');
    expect(partnerAdj?.debitAccountCode).toBe(partnerPayableCode(PARTNER_ID));
    expect(partnerAdj?.creditAccountCode).toBe(SYSTEM_ACCOUNTS.REFUND_PENDING);
    expect(partnerAdj?.amount).toBe(150);
  });

  it('carries correct reservation and partner IDs on each entry', () => {
    const entries = buildRefundJournal({
      partnerId: PARTNER_ID,
      reservationId: RESERVATION_ID,
      refundAmount: 200,
      commissionRefund: 50,
      partnerRefund: 150,
      currency: 'MUR',
    });

    for (const entry of entries) {
      expect(entry.reservationId).toBe(RESERVATION_ID);
      expect(entry.partnerId).toBe(PARTNER_ID);
    }
  });
});

describe('buildPayoutJournal', () => {
  it('builds a single payout entry', () => {
    const entries = buildPayoutJournal({
      partnerId: PARTNER_ID,
      payoutAmount: 1500,
      currency: 'MUR',
      statementId: 'stmt-001',
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]!.debitAccountCode).toBe(partnerPayableCode(PARTNER_ID));
    expect(entries[0]!.creditAccountCode).toBe(SYSTEM_ACCOUNTS.PAYOUT_TRANSIT);
    expect(entries[0]!.amount).toBe(1500);
    expect(entries[0]!.entryType).toBe('payout');
  });
});
