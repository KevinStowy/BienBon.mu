/**
 * Basket lifecycle statuses (ADR-017, section 2.3).
 *
 * DRAFT        — Created but not yet visible to consumers.
 * PUBLISHED    — Active, available for reservation.
 * SOLD_OUT     — All stock reserved; not accepting new reservations.
 * PICKUP_WINDOW — Current time is within the pickup window.
 * ENDED        — Pickup window has closed.
 * CANCELLED    — Partner cancelled before pickup.
 * ARCHIVED     — Permanently closed, historical record.
 */
export const BasketStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SOLD_OUT: 'SOLD_OUT',
  PICKUP_WINDOW: 'PICKUP_WINDOW',
  ENDED: 'ENDED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type BasketStatus = (typeof BasketStatus)[keyof typeof BasketStatus];
