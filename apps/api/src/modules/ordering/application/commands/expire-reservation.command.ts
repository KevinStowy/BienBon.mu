/**
 * Command to expire a reservation that was not paid in time.
 *
 * Triggered by a scheduled job (BullMQ cron) or manually by the system.
 * Stock is re-incremented on expiry.
 * Transitions: PENDING_PAYMENT → EXPIRED
 */
export interface ExpireReservationCommand {
  /** UUID of the reservation to expire */
  reservationId: string;
}
