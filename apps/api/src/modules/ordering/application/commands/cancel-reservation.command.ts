/**
 * Command to cancel a reservation.
 *
 * Can be initiated by a consumer (before pickup window) or by a partner.
 * Stock is re-incremented upon cancellation.
 */
export interface CancelReservationCommand {
  /** UUID of the reservation to cancel */
  reservationId: string;
  /** UUID of the actor cancelling the reservation */
  actorId: string;
  /** Role of the actor: determines which cancellation event to apply */
  actorRole: 'consumer' | 'partner' | 'admin';
  /** Optional reason for cancellation */
  reason?: string;
}
