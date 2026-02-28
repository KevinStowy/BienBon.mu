/**
 * Query to retrieve a single reservation by ID.
 */
export interface GetReservationQuery {
  /** UUID of the reservation */
  reservationId: string;
}
