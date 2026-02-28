export interface CapturePaymentCommand {
  /** The pre-auth transaction ID (our internal ID) */
  transactionId: string;
  /** Actor triggering the capture (usually 'system') */
  actorId: string;
}
