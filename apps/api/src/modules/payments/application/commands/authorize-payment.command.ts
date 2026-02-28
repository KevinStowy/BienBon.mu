import type { PaymentMethod } from '@bienbon/shared-types';

export interface AuthorizePaymentCommand {
  /** The reservation being paid for */
  reservationId: string;
  /** Consumer making the payment */
  consumerId: string;
  /** Partner receiving the payment (used for commission) */
  partnerId: string;
  /** Amount in MUR */
  amount: number;
  /** Currency code */
  currency: string;
  /** Payment method */
  paymentMethod: PaymentMethod;
  /** Tokenized payment method reference (from Peach JS widget) */
  paymentMethodToken: string;
  /** Idempotency key to prevent double charges */
  idempotencyKey?: string;
}
