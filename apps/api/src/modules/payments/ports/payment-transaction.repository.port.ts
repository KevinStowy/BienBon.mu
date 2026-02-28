// =============================================================================
// PaymentTransactionRepositoryPort — outbound port for transaction persistence
// =============================================================================

import type { PaymentStatus, PaymentMethod, PaymentType } from '@bienbon/shared-types';

export interface CreateTransactionInput {
  id: string;
  reservationId: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  providerTxId?: string;
  providerStatus?: string;
  consumerId?: string;
  partnerId?: string;
  parentTxId?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTransactionInput {
  status?: PaymentStatus;
  providerTxId?: string;
  providerStatus?: string;
  commissionRate?: number;
  commissionAmount?: number;
  partnerNetAmount?: number;
  feeMinimumApplied?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PaymentTransactionRecord {
  id: string;
  reservationId: string;
  type: PaymentType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  providerTxId: string | null;
  providerStatus: string | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  partnerNetAmount: number | null;
  feeMinimumApplied: boolean;
  consumerId: string | null;
  partnerId: string | null;
  parentTxId: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export abstract class PaymentTransactionRepositoryPort {
  abstract create(input: CreateTransactionInput): Promise<PaymentTransactionRecord>;

  abstract findById(id: string): Promise<PaymentTransactionRecord | null>;

  abstract findByReservationId(reservationId: string): Promise<PaymentTransactionRecord[]>;

  abstract findByIdempotencyKey(key: string): Promise<PaymentTransactionRecord | null>;

  abstract findByProviderTxId(providerTxId: string): Promise<PaymentTransactionRecord | null>;

  abstract update(id: string, input: UpdateTransactionInput): Promise<PaymentTransactionRecord>;

  abstract findCapturedByReservationId(reservationId: string): Promise<PaymentTransactionRecord | null>;
}
