// =============================================================================
// LedgerEntry — domain entity (immutable)
// =============================================================================
// ADR-007: Double-entry bookkeeping
// IMMUTABLE: once written, ledger entries NEVER change.
// Corrections are made via compensating entries.
// =============================================================================

import { z } from 'zod';

export const LedgerEntrySchema = z.object({
  id: z.string().uuid(),
  journalId: z.string().uuid(),
  transactionId: z.string().uuid().nullable(),
  sequenceNumber: z.number().int().positive(),
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('MUR'),
  vatRate: z.number().min(0).max(1).default(0),
  vatAmount: z.number().min(0).default(0),
  description: z.string().min(1),
  entryType: z.string().min(1),
  reservationId: z.string().uuid().nullable(),
  partnerId: z.string().uuid().nullable(),
  createdBy: z.string().min(1),
  createdAt: z.date(),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

// ---------------------------------------------------------------------------
// System account codes (seeded at startup)
// ---------------------------------------------------------------------------

export const SYSTEM_ACCOUNTS = {
  /** Funds received from payment gateway */
  GATEWAY: 'GATEWAY',
  /** Mobile money funds held before matching */
  CONSUMER_HOLDING: 'CONSUMER_HOLDING',
  /** Platform commission revenue */
  PLATFORM_REVENUE: 'PLATFORM_REVENUE',
  /** Contra-revenue for commission adjustments on refunds */
  PLATFORM_REVENUE_ADJUSTMENT: 'PLATFORM_REVENUE_ADJUSTMENT',
  /** VAT on commissions collected */
  VAT_COLLECTED: 'VAT_COLLECTED',
  /** Refund amounts in transit back to consumer */
  REFUND_PENDING: 'REFUND_PENDING',
  /** Partner payouts in transit to bank */
  PAYOUT_TRANSIT: 'PAYOUT_TRANSIT',
  /** Payment processing fees (Peach gateway fees) */
  PROCESSING_FEES: 'PROCESSING_FEES',
} as const;

export type SystemAccountCode = (typeof SYSTEM_ACCOUNTS)[keyof typeof SYSTEM_ACCOUNTS];

/**
 * Returns the ledger account code for a partner's payable account.
 * These accounts are created lazily on first transaction.
 */
export function partnerPayableCode(partnerId: string): string {
  return `PARTNER_PAYABLE:${partnerId}`;
}

/**
 * Validates that a journal balances (total debits = total credits).
 * All amounts are in the SAME currency for simplicity.
 */
export function assertJournalBalances(
  entries: Array<{ debitAccountId: string; creditAccountId: string; amount: number }>,
): void {
  // In a true double-entry system, each entry has ONE debit and ONE credit.
  // Our schema has debitAccountId + creditAccountId per entry.
  // Each entry contributes equally to both sides, so a single-entry journal always balances.
  // We validate that all amounts are positive and finite.
  for (const entry of entries) {
    if (entry.amount <= 0 || !isFinite(entry.amount)) {
      throw new Error(`Invalid ledger entry amount: ${entry.amount}`);
    }
  }
}
