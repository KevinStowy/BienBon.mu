/**
 * Command to confirm a reservation after payment success.
 *
 * Triggered internally (ADMIN/system) when the payment provider
 * notifies that the payment was received.
 */
export interface ConfirmReservationCommand {
  /** UUID of the reservation to confirm */
  reservationId: string;
  /** UUID of the actor performing the confirmation (system or admin) */
  actorId: string;
  /** Role of the actor */
  actorRole: string;
}
