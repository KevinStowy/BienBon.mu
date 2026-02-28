/**
 * Command to validate pickup via QR code or PIN code.
 *
 * Triggered by a partner scanning the QR code or the consumer providing a PIN.
 * Transitions: READY → PICKED_UP
 */
export interface ValidatePickupCommand {
  /** UUID of the reservation being picked up */
  reservationId: string;
  /** UUID of the partner validating the pickup */
  actorId: string;
  /** QR code to validate (mutually exclusive with pinCode) */
  qrCode?: string;
  /** PIN code to validate (mutually exclusive with qrCode) */
  pinCode?: string;
}
