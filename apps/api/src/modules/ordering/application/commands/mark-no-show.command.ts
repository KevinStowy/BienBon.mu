/**
 * Command to mark a reservation as no-show.
 *
 * Triggered by a partner or a scheduled job when the consumer
 * did not pick up within the pickup window.
 * Transitions: READY → NO_SHOW
 */
export interface MarkNoShowCommand {
  /** UUID of the reservation to mark as no-show */
  reservationId: string;
  /** UUID of the actor (partner or system) */
  actorId: string;
  /** Role of the actor */
  actorRole: string;
}
