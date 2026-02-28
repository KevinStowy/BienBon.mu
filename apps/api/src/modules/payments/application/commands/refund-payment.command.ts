export interface RefundPaymentCommand {
  /** The captured transaction ID to refund */
  transactionId: string;
  /** Amount to refund in MUR (must be <= captured amount) */
  amount: number;
  /** Human-readable refund reason */
  reason: string;
  /** Actor requesting the refund (admin ID or system) */
  actorId: string;
}
