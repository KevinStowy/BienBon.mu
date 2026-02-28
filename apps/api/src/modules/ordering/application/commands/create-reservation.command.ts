/**
 * Command to create a new reservation.
 *
 * Triggered by a consumer when they want to reserve a basket.
 * Stock is decremented atomically before the reservation is persisted.
 */
export interface CreateReservationCommand {
  /** UUID of the basket to reserve */
  basketId: string;
  /** UUID of the consumer making the reservation */
  consumerId: string;
  /** Number of baskets to reserve (usually 1) */
  quantity: number;
}
