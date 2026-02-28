// =============================================================================
// LedgerService — orchestrates double-entry write operations
// =============================================================================
// ADR-007: Double-entry bookkeeping
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { LedgerRepositoryPort } from '../../ports/ledger.repository.port';
import type { LedgerEntryRecord } from '../../ports/ledger.repository.port';
import {
  buildCaptureJournal,
  buildMobileCapture,
  buildRefundJournal,
  buildPayoutJournal,
} from '../../domain/rules/ledger-rules';
import type {
  CaptureJournalParams,
  RefundJournalParams,
  PayoutJournalParams,
} from '../../domain/rules/ledger-rules';
import { partnerPayableCode } from '../../domain/entities/ledger-entry.entity';
import { PaymentMethod } from '@bienbon/shared-types';
import type { PartnerBalance } from '../../ports/ledger.repository.port';

const MOBILE_METHODS = new Set<string>([
  PaymentMethod.MCB_JUICE,
  PaymentMethod.BLINK,
  PaymentMethod.MYT_MONEY,
]);

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly ledgerRepo: LedgerRepositoryPort) {}

  /**
   * Posts the capture journal for a payment.
   * Chooses card vs. mobile money journal template based on payment method.
   */
  async postCaptureJournal(
    params: CaptureJournalParams & { paymentMethod: string; transactionId?: string },
  ): Promise<LedgerEntryRecord[]> {
    // Ensure partner payable account exists
    await this.ensurePartnerPayableAccount(params.partnerId);

    const entries = MOBILE_METHODS.has(params.paymentMethod)
      ? buildMobileCapture(params)
      : buildCaptureJournal(params);

    const result = await this.ledgerRepo.postJournal({
      entries,
      transactionId: params.transactionId,
      createdBy: 'system',
    });

    this.logger.log(
      `Posted capture journal for reservation ${params.reservationId}: ` +
      `commission=${params.commissionAmount}, partnerNet=${params.partnerNetAmount}`,
    );

    return result;
  }

  /**
   * Posts the refund journal.
   */
  async postRefundJournal(
    params: RefundJournalParams & { transactionId?: string },
  ): Promise<LedgerEntryRecord[]> {
    await this.ensurePartnerPayableAccount(params.partnerId);

    const entries = buildRefundJournal(params);

    const result = await this.ledgerRepo.postJournal({
      entries,
      transactionId: params.transactionId,
      createdBy: 'system',
    });

    this.logger.log(
      `Posted refund journal for reservation ${params.reservationId}: ` +
      `amount=${params.refundAmount}`,
    );

    return result;
  }

  /**
   * Posts the payout journal (when funds are transferred to partner bank).
   */
  async postPayoutJournal(
    params: PayoutJournalParams,
  ): Promise<LedgerEntryRecord[]> {
    await this.ensurePartnerPayableAccount(params.partnerId);

    const entries = buildPayoutJournal(params);

    const result = await this.ledgerRepo.postJournal({
      entries,
      createdBy: 'system',
    });

    this.logger.log(
      `Posted payout journal for partner ${params.partnerId}: amount=${params.payoutAmount}`,
    );

    return result;
  }

  /**
   * Returns the current balance for a partner.
   */
  async getPartnerBalance(partnerId: string): Promise<PartnerBalance> {
    return this.ledgerRepo.getPartnerBalance(partnerId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async ensurePartnerPayableAccount(partnerId: string): Promise<void> {
    const code = partnerPayableCode(partnerId);
    await this.ledgerRepo.findOrCreateAccount(code, {
      name: `Partner Payable — ${partnerId}`,
      type: 'LIABILITY',
      normalBalance: 'CREDIT',
      entityType: 'PARTNER',
      entityId: partnerId,
    });
  }
}
