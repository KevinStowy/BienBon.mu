/**
 * Reservation lifecycle statuses (ADR-017).
 *
 * PENDING_PAYMENT     — Reservation created, awaiting payment confirmation.
 * CONFIRMED           — Payment received, reservation is active.
 * READY               — Partner has marked the basket as ready for pickup.
 * PICKED_UP           — Consumer picked up the basket (QR/PIN validated).
 * NO_SHOW             — Consumer did not pick up within the window.
 * CANCELLED_CONSUMER  — Consumer cancelled before pickup_start.
 * CANCELLED_PARTNER   — Partner cancelled the reservation.
 * EXPIRED             — Payment not received within 5 minutes (hold timeout).
 */
export const ReservationStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  NO_SHOW: 'NO_SHOW',
  CANCELLED_CONSUMER: 'CANCELLED_CONSUMER',
  CANCELLED_PARTNER: 'CANCELLED_PARTNER',
  EXPIRED: 'EXPIRED',
} as const;

export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

/** Terminal statuses — no further transitions allowed */
export const TERMINAL_STATUSES: ReadonlySet<ReservationStatus> = new Set([
  ReservationStatus.PICKED_UP,
  ReservationStatus.NO_SHOW,
  ReservationStatus.CANCELLED_CONSUMER,
  ReservationStatus.CANCELLED_PARTNER,
  ReservationStatus.EXPIRED,
]);
