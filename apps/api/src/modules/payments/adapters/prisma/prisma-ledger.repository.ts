// =============================================================================
// PrismaLedgerRepository — atomic double-entry journal writer
// =============================================================================
// ADR-007: Double-entry bookkeeping
// All journal writes are atomic PostgreSQL transactions.
// Ledger entries are IMMUTABLE.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LedgerAccountType, NormalBalance } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../../prisma/prisma.service';
import { LedgerRepositoryPort } from '../../ports/ledger.repository.port';
import type {
  PostJournalInput,
  LedgerEntryRecord,
  LedgerAccountRecord,
  PartnerBalance,
} from '../../ports/ledger.repository.port';
import { LedgerImbalanceError } from '../../domain/errors/payment-errors';

@Injectable()
export class PrismaLedgerRepository extends LedgerRepositoryPort {
  private readonly logger = new Logger(PrismaLedgerRepository.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async postJournal(input: PostJournalInput): Promise<LedgerEntryRecord[]> {
    const journalId = randomUUID();

    // Resolve all account codes to IDs
    const accountCodes = new Set<string>();
    for (const entry of input.entries) {
      accountCodes.add(entry.debitAccountCode);
      accountCodes.add(entry.creditAccountCode);
    }

    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { code: { in: [...accountCodes] } },
    });

    const accountMap = new Map(accounts.map((a) => [a.code, a]));

    // Validate all accounts exist
    for (const code of accountCodes) {
      if (!accountMap.has(code)) {
        throw new Error(`Ledger account '${code}' not found. Ensure it is seeded before posting.`);
      }
    }

    // Get next sequence number (global monotonic counter via advisory lock)
    const [seqResult] = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('ledger_sequence')
    `.catch(async () => {
      // Fallback if sequence does not exist: use max(sequence_number) + 1
      const max = await this.prisma.ledgerEntry.aggregate({
        _max: { sequenceNumber: true },
      });
      const next = (max._max.sequenceNumber ?? 0) + 1;
      return [{ nextval: BigInt(next) }];
    });

    let sequenceNumber = Number(seqResult.nextval);

    // Write all entries atomically
    const createdEntries = await this.prisma.$transaction(async (tx) => {
      const results: LedgerEntryRecord[] = [];

      for (const entryDraft of input.entries) {
        const debitAccount = accountMap.get(entryDraft.debitAccountCode);
        const creditAccount = accountMap.get(entryDraft.creditAccountCode);

        if (!debitAccount || !creditAccount) {
          throw new LedgerImbalanceError(journalId, 0, 0);
        }

        const record = await tx.ledgerEntry.create({
          data: {
            journalId,
            transactionId: input.transactionId ?? null,
            sequenceNumber: sequenceNumber++,
            debitAccountId: debitAccount.id,
            creditAccountId: creditAccount.id,
            amount: entryDraft.amount,
            currency: entryDraft.currency,
            vatRate: entryDraft.vatRate ?? 0,
            vatAmount: entryDraft.vatAmount ?? 0,
            description: entryDraft.description,
            entryType: entryDraft.entryType,
            reservationId: entryDraft.reservationId ?? null,
            partnerId: entryDraft.partnerId ?? null,
            createdBy: input.createdBy,
          },
        });

        results.push(this.mapEntry(record));
      }

      return results;
    });

    this.logger.debug(
      `Posted journal ${journalId} with ${createdEntries.length} entries`,
    );

    return createdEntries;
  }

  async getPartnerBalance(partnerId: string): Promise<PartnerBalance> {
    const code = `PARTNER_PAYABLE:${partnerId}`;

    const account = await this.prisma.ledgerAccount.findUnique({
      where: { code },
    });

    if (!account) {
      return { partnerId, balance: 0, currency: 'MUR' };
    }

    // Sum credit entries (normal balance = CREDIT) minus debit entries
    const [credits, debits] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { creditAccountId: account.id },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { debitAccountId: account.id },
        _sum: { amount: true },
      }),
    ]);

    const creditTotal = this.decimalToNumber(credits._sum.amount);
    const debitTotal = this.decimalToNumber(debits._sum.amount);
    const balance = creditTotal - debitTotal;

    return { partnerId, balance, currency: 'MUR' };
  }

  async findOrCreateAccount(
    code: string,
    params: {
      name: string;
      type: string;
      normalBalance: string;
      entityType: string;
      entityId?: string;
    },
  ): Promise<LedgerAccountRecord> {
    const existing = await this.prisma.ledgerAccount.findUnique({ where: { code } });

    if (existing) {
      return this.mapAccount(existing);
    }

    const created = await this.prisma.ledgerAccount.create({
      data: {
        code,
        name: params.name,
        type: params.type as LedgerAccountType,
        normalBalance: params.normalBalance as NormalBalance,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        currency: 'MUR',
        isActive: true,
      },
    });

    return this.mapAccount(created);
  }

  // ---------------------------------------------------------------------------
  // Private mappers
  // ---------------------------------------------------------------------------

  private mapEntry(record: {
    id: string;
    journalId: string;
    transactionId: string | null;
    sequenceNumber: number;
    debitAccountId: string;
    creditAccountId: string;
    amount: { toNumber: () => number } | number;
    currency: string;
    vatRate: { toNumber: () => number } | number;
    vatAmount: { toNumber: () => number } | number;
    description: string;
    entryType: string;
    reservationId: string | null;
    partnerId: string | null;
    createdBy: string;
    createdAt: Date;
  }): LedgerEntryRecord {
    return {
      id: record.id,
      journalId: record.journalId,
      transactionId: record.transactionId,
      sequenceNumber: record.sequenceNumber,
      debitAccountId: record.debitAccountId,
      creditAccountId: record.creditAccountId,
      amount: this.decimalToNumber(record.amount),
      currency: record.currency,
      vatRate: this.decimalToNumber(record.vatRate),
      vatAmount: this.decimalToNumber(record.vatAmount),
      description: record.description,
      entryType: record.entryType,
      reservationId: record.reservationId,
      partnerId: record.partnerId,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
    };
  }

  private mapAccount(record: {
    id: string;
    code: string;
    name: string;
    type: string;
    normalBalance: string;
    entityType: string;
    entityId: string | null;
    currency: string;
    isActive: boolean;
  }): LedgerAccountRecord {
    return {
      id: record.id,
      code: record.code,
      name: record.name,
      type: record.type,
      normalBalance: record.normalBalance,
      entityType: record.entityType,
      entityId: record.entityId,
      currency: record.currency,
      isActive: record.isActive,
    };
  }

  private decimalToNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && 'toNumber' in value) {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value);
  }
}
