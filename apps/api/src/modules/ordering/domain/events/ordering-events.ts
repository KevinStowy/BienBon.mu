/**
 * Domain events for the Ordering bounded context.
 *
 * These events are emitted via EventEmitter2 to allow other bounded contexts
 * to react without direct imports (ADR-024).
 */

export const ORDERING_EVENTS = {
  RESERVATION_CREATED: 'ordering.reservation.created',
  RESERVATION_CONFIRMED: 'ordering.reservation.confirmed',
  RESERVATION_CANCELLED: 'ordering.reservation.cancelled',
  RESERVATION_READY: 'ordering.reservation.ready',
  RESERVATION_PICKED_UP: 'ordering.reservation.picked_up',
  RESERVATION_NO_SHOW: 'ordering.reservation.no_show',
  RESERVATION_EXPIRED: 'ordering.reservation.expired',
} as const;

export type OrderingEventKey =
  (typeof ORDERING_EVENTS)[keyof typeof ORDERING_EVENTS];

export interface ReservationCreatedEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  quantity: number;
  totalPrice: number;
  expiresAt: Date | null;
}

export interface ReservationConfirmedEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  totalPrice: number;
  confirmedAt: Date;
}

export interface ReservationCancelledEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  quantity: number;
  cancelledBy: 'consumer' | 'partner';
  reason?: string;
  cancelledAt: Date;
}

export interface ReservationReadyEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  readyAt: Date;
}

export interface ReservationPickedUpEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  pickedUpAt: Date;
}

export interface ReservationNoShowEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  noShowAt: Date;
}

export interface ReservationExpiredEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  quantity: number;
  expiredAt: Date;
}
