// =============================================================================
// PaymentTransaction — domain entity
// =============================================================================
// ADR-024: DDD entities with Zod validation
// ADR-005: Payment model
// =============================================================================

import { z } from 'zod';
import { PaymentStatus, PaymentMethod, PaymentType } from '@bienbon/shared-types';

export const PaymentTransactionSchema = z.object({
  id: z.string().uuid(),
  reservationId: z.string().uuid(),
  type: z.nativeEnum(PaymentType),
  status: z.nativeEnum(PaymentStatus),
  amount: z.number().positive(),
  currency: z.string().length(3).default('MUR'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  providerTxId: z.string().nullable().default(null),
  providerStatus: z.string().nullable().default(null),
  commissionRate: z.number().min(0).max(1).nullable().default(null),
  commissionAmount: z.number().nonnegative().nullable().default(null),
  partnerNetAmount: z.number().nonnegative().nullable().default(null),
  feeMinimumApplied: z.boolean().default(false),
  consumerId: z.string().uuid().nullable().default(null),
  partnerId: z.string().uuid().nullable().default(null),
  parentTxId: z.string().uuid().nullable().default(null),
  idempotencyKey: z.string().nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PaymentTransaction = z.infer<typeof PaymentTransactionSchema>;

export function createPaymentTransaction(input: unknown): PaymentTransaction {
  return PaymentTransactionSchema.parse(input);
}

/**
 * Returns true if the transaction can be captured (must be a successful pre-auth).
 */
export function canCapture(tx: PaymentTransaction): boolean {
  return tx.type === PaymentType.PRE_AUTH && tx.status === PaymentStatus.SUCCEEDED;
}

/**
 * Returns true if the transaction can be refunded.
 */
export function canRefund(tx: PaymentTransaction): boolean {
  return tx.type === PaymentType.CAPTURE && tx.status === PaymentStatus.SUCCEEDED;
}

/**
 * Returns true if the transaction can be voided (pre-auth that succeeded but wasn't captured).
 */
export function canVoid(tx: PaymentTransaction): boolean {
  return tx.type === PaymentType.PRE_AUTH && tx.status === PaymentStatus.SUCCEEDED;
}
