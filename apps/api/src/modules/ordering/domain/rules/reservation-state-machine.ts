import { ReservationStatus } from '../enums/reservation-status.enum';
import { InvalidReservationTransitionError } from '../errors/ordering-errors';

/**
 * Events that drive reservation state transitions (ADR-017).
 */
export const ReservationEvent = {
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  HOLD_TIMEOUT: 'HOLD_TIMEOUT',
  CONSUMER_CANCEL: 'CONSUMER_CANCEL',
  PARTNER_CANCEL: 'PARTNER_CANCEL',
  PICKUP_WINDOW_START: 'PICKUP_WINDOW_START',
  QR_VALIDATED: 'QR_VALIDATED',
  NO_SHOW_TIMEOUT: 'NO_SHOW_TIMEOUT',
} as const;

export type ReservationEvent =
  (typeof ReservationEvent)[keyof typeof ReservationEvent];

/**
 * Transition table: [fromStatus][event] → toStatus
 * Only valid transitions are listed. All others throw InvalidReservationTransitionError.
 *
 * ADR-017 state machine for Reservation:
 *
 * PENDING_PAYMENT  --PAYMENT_SUCCESS-->    CONFIRMED
 * PENDING_PAYMENT  --PAYMENT_FAILED-->     EXPIRED
 * PENDING_PAYMENT  --HOLD_TIMEOUT-->       EXPIRED
 * CONFIRMED        --CONSUMER_CANCEL-->    CANCELLED_CONSUMER
 * CONFIRMED        --PARTNER_CANCEL-->     CANCELLED_PARTNER
 * CONFIRMED        --PICKUP_WINDOW_START-> READY
 * READY            --QR_VALIDATED-->       PICKED_UP
 * READY            --NO_SHOW_TIMEOUT-->    NO_SHOW
 * READY            --PARTNER_CANCEL-->     CANCELLED_PARTNER
 */
const TRANSITION_TABLE: Partial<
  Record<ReservationStatus, Partial<Record<ReservationEvent, ReservationStatus>>>
> = {
  [ReservationStatus.PENDING_PAYMENT]: {
    [ReservationEvent.PAYMENT_SUCCESS]: ReservationStatus.CONFIRMED,
    [ReservationEvent.PAYMENT_FAILED]: ReservationStatus.EXPIRED,
    [ReservationEvent.HOLD_TIMEOUT]: ReservationStatus.EXPIRED,
  },
  [ReservationStatus.CONFIRMED]: {
    [ReservationEvent.CONSUMER_CANCEL]: ReservationStatus.CANCELLED_CONSUMER,
    [ReservationEvent.PARTNER_CANCEL]: ReservationStatus.CANCELLED_PARTNER,
    [ReservationEvent.PICKUP_WINDOW_START]: ReservationStatus.READY,
  },
  [ReservationStatus.READY]: {
    [ReservationEvent.QR_VALIDATED]: ReservationStatus.PICKED_UP,
    [ReservationEvent.NO_SHOW_TIMEOUT]: ReservationStatus.NO_SHOW,
    [ReservationEvent.PARTNER_CANCEL]: ReservationStatus.CANCELLED_PARTNER,
  },
};

/**
 * Pure function: applies an event to a current status and returns the new status.
 * Throws InvalidReservationTransitionError if the transition is not allowed.
 *
 * @param currentStatus - The current status of the reservation
 * @param event - The event to apply
 * @returns The new status after the transition
 */
export function transition(
  currentStatus: ReservationStatus,
  event: ReservationEvent,
): ReservationStatus {
  const validTransitions = TRANSITION_TABLE[currentStatus];

  if (!validTransitions) {
    throw new InvalidReservationTransitionError(currentStatus, event);
  }

  const nextStatus = validTransitions[event];

  if (!nextStatus) {
    throw new InvalidReservationTransitionError(currentStatus, event);
  }

  return nextStatus;
}

/**
 * Returns all valid events that can be applied from a given status.
 * Useful for debugging and documentation.
 */
export function getValidEvents(status: ReservationStatus): ReservationEvent[] {
  const validTransitions = TRANSITION_TABLE[status];
  if (!validTransitions) return [];
  return Object.keys(validTransitions) as ReservationEvent[];
}
