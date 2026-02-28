// =============================================================================
// Ledger Rules — pure functions that build journal entry drafts
// =============================================================================
// ADR-007: Double-entry bookkeeping journal templates
// These functions are pure — no DB calls, no side effects.
// =============================================================================

import { SYSTEM_ACCOUNTS, partnerPayableCode } from '../entities/ledger-entry.entity';
import type { LedgerEntryDraft } from '../../ports/ledger.repository.port';

// ---------------------------------------------------------------------------
// Capture journals
// ---------------------------------------------------------------------------

export interface CaptureJournalParams {
  partnerId: string;
  reservationId: string;
  totalAmount: number;
  commissionAmount: number;
  partnerNetAmount: number;
  currency: string;
}

/**
 * Card capture journal.
 *
 * When a card is charged (funds arrive at gateway):
 *   DEBIT  GATEWAY          → commission portion → CREDIT PLATFORM_REVENUE
 *   DEBIT  GATEWAY          → partner portion    → CREDIT PARTNER_PAYABLE:<partnerId>
 */
export function buildCaptureJournal(params: CaptureJournalParams): LedgerEntryDraft[] {
  const entries: LedgerEntryDraft[] = [];

  if (params.commissionAmount > 0) {
    entries.push({
      debitAccountCode: SYSTEM_ACCOUNTS.GATEWAY,
      creditAccountCode: SYSTEM_ACCOUNTS.PLATFORM_REVENUE,
      amount: params.commissionAmount,
      currency: params.currency,
      entryType: 'commission',
      description: `Platform commission for reservation ${params.reservationId}`,
      reservationId: params.reservationId,
      partnerId: params.partnerId,
    });
  }

  if (params.partnerNetAmount > 0) {
    entries.push({
      debitAccountCode: SYSTEM_ACCOUNTS.GATEWAY,
      creditAccountCode: partnerPayableCode(params.partnerId),
      amount: params.partnerNetAmount,
      currency: params.currency,
      entryType: 'partner_credit',
      description: `Partner net payout credit for reservation ${params.reservationId}`,
      reservationId: params.reservationId,
      partnerId: params.partnerId,
    });
  }

  return entries;
}

/**
 * Mobile money capture journal.
 *
 * Funds were pre-held in CONSUMER_HOLDING (from mobile money top-up).
 * On capture: release from holding to platform revenue + partner payable.
 */
export function buildMobileCapture(params: CaptureJournalParams): LedgerEntryDraft[] {
  const entries: LedgerEntryDraft[] = [];

  if (params.commissionAmount > 0) {
    entries.push({
      debitAccountCode: SYSTEM_ACCOUNTS.CONSUMER_HOLDING,
      creditAccountCode: SYSTEM_ACCOUNTS.PLATFORM_REVENUE,
      amount: params.commissionAmount,
      currency: params.currency,
      entryType: 'commission',
      description: `Platform commission (mobile money) for reservation ${params.reservationId}`,
      reservationId: params.reservationId,
      partnerId: params.partnerId,
    });
  }

  if (params.partnerNetAmount > 0) {
    entries.push({
      debitAccountCode: SYSTEM_ACCOUNTS.CONSUMER_HOLDING,
      creditAccountCode: partnerPayableCode(params.partnerId),
      amount: params.partnerNetAmount,
      currency: params.currency,
      entryType: 'partner_credit',
      description: `Partner net payout credit (mobile money) for reservation ${params.reservationId}`,
      reservationId: params.reservationId,
      partnerId: params.partnerId,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Refund journals
// ---------------------------------------------------------------------------

export interface RefundJournalParams {
  partnerId: string;
  reservationId: string;
  refundAmount: number;
  commissionRefund: number;
  partnerRefund: number;
  currency: string;
}

/**
 * Full or partial refund journal.
 *
 * Reversal of the capture:
 *   DEBIT  REFUND_PENDING   → total refund amount   → CREDIT GATEWAY
 *   DEBIT  PLATFORM_REVENUE_ADJUSTMENT → commission portion → CREDIT REFUND_PENDING
 *   DEBIT  PARTNER_PAYABLE:<id>         → partner portion   → CREDIT REFUND_PENDING
 *
 * Net effect: funds flow back through gateway to consumer.
 */
export function buildRefundJournal(params: RefundJournalParams): LedgerEntryDraft[] {
  const entries: LedgerEntryDraft[] = [];

  // Step 1: Mark total refund as pending (owed back to consumer)
  entries.push({
    debitAccountCode: SYSTEM_ACCOUNTS.REFUND_PENDING,
    creditAccountCode: SYSTEM_ACCOUNTS.GATEWAY,
    amount: params.refundAmount,
    currency: params.currency,
    entryType: 'refund_consumer',
    description: `Refund to consumer for reservation ${params.reservationId}`,
    reservationId: params.reservationId,
    partnerId: params.partnerId,
  });

  // Step 2: Adjust platform revenue (reversal of commission)
  if (params.commissionRefund > 0) {
    entries.push({
      debitAccountCode: SYSTEM_ACCOUNTS.PLATFORM_REVENUE_ADJUSTMENT,
      creditAccountCode: SYSTEM_ACCOUNTS.REFUND_PENDING,
      amount: params.commissionRefund,
      currency: params.currency,
      entryType: 'refund_commission_adj',
      description: `Commission reversal for refund on reservation ${params.reservationId}`,
      reservationId: params.reservationId,
      partnerId: params.partnerId,
    });
  }

  // Step 3: Claw back partner payable
  if (params.partnerRefund > 0) {
    entries.push({
      debitAccountCode: partnerPayableCode(params.partnerId),
      creditAccountCode: SYSTEM_ACCOUNTS.REFUND_PENDING,
      amount: params.partnerRefund,
      currency: params.currency,
      entryType: 'refund_partner_adj',
      description: `Partner payable adjustment for refund on reservation ${params.reservationId}`,
      reservationId: params.reservationId,
      partnerId: params.partnerId,
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Payout journal
// ---------------------------------------------------------------------------

export interface PayoutJournalParams {
  partnerId: string;
  payoutAmount: number;
  currency: string;
  statementId: string;
}

/**
 * Payout journal — when funds are wired to partner bank account.
 *
 *   DEBIT  PARTNER_PAYABLE:<id> → payout amount → CREDIT PAYOUT_TRANSIT
 */
export function buildPayoutJournal(params: PayoutJournalParams): LedgerEntryDraft[] {
  return [
    {
      debitAccountCode: partnerPayableCode(params.partnerId),
      creditAccountCode: SYSTEM_ACCOUNTS.PAYOUT_TRANSIT,
      amount: params.payoutAmount,
      currency: params.currency,
      entryType: 'payout',
      description: `Partner payout for statement ${params.statementId}`,
      partnerId: params.partnerId,
    },
  ];
}
