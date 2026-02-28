// =============================================================================
// LedgerRepositoryPort — outbound port for ledger persistence
// =============================================================================
// ADR-007: Double-entry bookkeeping
// All writes are atomic PostgreSQL transactions.
// Ledger entries are IMMUTABLE — no updates, no deletes.
// =============================================================================

export interface LedgerAccountRecord {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  entityType: string;
  entityId: string | null;
  currency: string;
  isActive: boolean;
}

export interface LedgerEntryDraft {
  /** Account code to debit (e.g., 'GATEWAY', 'PARTNER_PAYABLE:uuid') */
  debitAccountCode: string;
  /** Account code to credit */
  creditAccountCode: string;
  /** Amount in MUR */
  amount: number;
  /** Currency (default MUR) */
  currency: string;
  /** Entry type slug (e.g., 'commission', 'partner_credit', 'refund_consumer') */
  entryType: string;
  /** Human-readable description */
  description: string;
  /** VAT rate (e.g., 0.15 for 15%) */
  vatRate?: number;
  /** VAT amount */
  vatAmount?: number;
  /** Linked reservation ID */
  reservationId?: string;
  /** Linked partner ID */
  partnerId?: string;
}

export interface PostJournalInput {
  /** All entries that form this atomic journal */
  entries: LedgerEntryDraft[];
  /** The payment transaction that triggered this journal */
  transactionId?: string;
  /** Who created this journal (system, userId, etc.) */
  createdBy: string;
}

export interface LedgerEntryRecord {
  id: string;
  journalId: string;
  transactionId: string | null;
  sequenceNumber: number;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  currency: string;
  vatRate: number;
  vatAmount: number;
  description: string;
  entryType: string;
  reservationId: string | null;
  partnerId: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface PartnerBalance {
  partnerId: string;
  /** Sum of PARTNER_PAYABLE credit entries minus debit entries */
  balance: number;
  currency: string;
}

export abstract class LedgerRepositoryPort {
  /**
   * Post an atomic journal (multiple entries that must balance).
   * All entries are written in a single DB transaction.
   * Validates debit total = credit total before writing.
   */
  abstract postJournal(input: PostJournalInput): Promise<LedgerEntryRecord[]>;

  /**
   * Get the current balance for a partner's PARTNER_PAYABLE account.
   */
  abstract getPartnerBalance(partnerId: string): Promise<PartnerBalance>;

  /**
   * Find or create a ledger account by code.
   * Used to lazily create per-partner accounts.
   */
  abstract findOrCreateAccount(code: string, params: {
    name: string;
    type: string;
    normalBalance: string;
    entityType: string;
    entityId?: string;
  }): Promise<LedgerAccountRecord>;
}
