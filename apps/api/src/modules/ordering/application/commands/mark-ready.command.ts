/**
 * Command to mark a reservation as ready for pickup.
 *
 * Triggered by a partner when the basket is prepared and ready to be collected.
 * Transitions: CONFIRMED → READY
 */
export interface MarkReadyCommand {
  /** UUID of the reservation to mark as ready */
  reservationId: string;
  /** UUID of the partner marking it ready */
  actorId: string;
}
