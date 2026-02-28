import {
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from '../../../../shared/errors/domain-error';

/**
 * Thrown when a reservation is not found by ID.
 */
export class ReservationNotFoundError extends NotFoundError {
  constructor(reservationId: string) {
    super(
      'RESERVATION_NOT_FOUND',
      `Reservation '${reservationId}' not found`,
    );
  }
}

/**
 * Thrown when a state machine transition is not allowed.
 * E.g., trying to cancel a PICKED_UP reservation.
 */
export class InvalidReservationTransitionError extends BusinessRuleError {
  constructor(from: string, event: string) {
    super(
      'INVALID_RESERVATION_TRANSITION',
      `Cannot apply event '${event}' to reservation in status '${from}'`,
    );
  }
}

/**
 * Thrown when a consumer already has an active reservation (PENDING_PAYMENT or CONFIRMED)
 * for the same basket.
 */
export class DuplicateReservationError extends ConflictError {
  constructor(consumerId: string, basketId: string) {
    super(
      'DUPLICATE_RESERVATION',
      `Consumer '${consumerId}' already has an active reservation for basket '${basketId}'`,
    );
  }
}

/**
 * Thrown when a reservation has expired and an operation is attempted on it.
 */
export class ReservationExpiredError extends BusinessRuleError {
  constructor(reservationId: string) {
    super(
      'RESERVATION_EXPIRED',
      `Reservation '${reservationId}' has expired`,
    );
  }
}

/**
 * Thrown when QR code or PIN code validation fails during pickup.
 */
export class InvalidPickupCodeError extends BusinessRuleError {
  constructor() {
    super(
      'INVALID_PICKUP_CODE',
      'The provided QR code or PIN code does not match this reservation',
    );
  }
}

/**
 * Thrown when a consumer tries to cancel after the pickup window has started.
 */
export class CancellationWindowExpiredError extends BusinessRuleError {
  constructor(reservationId: string) {
    super(
      'CANCELLATION_WINDOW_EXPIRED',
      `Reservation '${reservationId}' cannot be cancelled after the pickup window has started`,
    );
  }
}
