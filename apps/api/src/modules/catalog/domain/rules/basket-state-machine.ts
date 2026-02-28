import { BasketStatus } from '../enums/basket-status.enum';
import { InvalidBasketTransitionError, BasketPublishGuardError } from '../errors/catalog-errors';
import type { Basket } from '../entities/basket.entity';

/**
 * Valid state transitions for the Basket aggregate (ADR-017, section 2.3).
 *
 * Key:   from status
 * Value: set of allowed target statuses
 */
const VALID_TRANSITIONS: Record<BasketStatus, Set<BasketStatus>> = {
  [BasketStatus.DRAFT]: new Set([
    BasketStatus.PUBLISHED,
    BasketStatus.ARCHIVED,
  ]),
  [BasketStatus.PUBLISHED]: new Set([
    BasketStatus.SOLD_OUT,
    BasketStatus.PICKUP_WINDOW,
    BasketStatus.CANCELLED,
    BasketStatus.ARCHIVED,
  ]),
  [BasketStatus.SOLD_OUT]: new Set([
    BasketStatus.PUBLISHED,
    BasketStatus.PICKUP_WINDOW,
  ]),
  [BasketStatus.PICKUP_WINDOW]: new Set([
    BasketStatus.ENDED,
    BasketStatus.SOLD_OUT,
  ]),
  [BasketStatus.ENDED]: new Set([
    BasketStatus.ARCHIVED,
  ]),
  [BasketStatus.CANCELLED]: new Set([
    BasketStatus.ARCHIVED,
  ]),
  [BasketStatus.ARCHIVED]: new Set(),
};

/**
 * Returns true if the transition from `from` to `to` is allowed by the state machine.
 * This is a pure function — no side effects.
 */
export function canTransition(from: BasketStatus, to: BasketStatus): boolean {
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

/**
 * Publish guard: validates that a basket meets all requirements to be published.
 *
 * A basket can be published only if:
 * - It has a non-empty title
 * - It has an original price > 0
 * - It has a selling price > 0
 * - It has stock > 0
 * - Pickup times are set (pickupStart and pickupEnd)
 * - pickupEnd is after pickupStart
 *
 * Throws BasketPublishGuardError if any guard fails.
 */
export function assertPublishable(basket: Basket): void {
  if (!basket.title || basket.title.trim().length === 0) {
    throw new BasketPublishGuardError('Basket must have a non-empty title to be published');
  }

  if (basket.originalPrice <= 0) {
    throw new BasketPublishGuardError('Basket must have a positive original price to be published');
  }

  if (basket.sellingPrice <= 0) {
    throw new BasketPublishGuardError('Basket must have a positive selling price to be published');
  }

  if (basket.stock <= 0) {
    throw new BasketPublishGuardError('Basket must have stock > 0 to be published');
  }

  if (!basket.pickupStart || !basket.pickupEnd) {
    throw new BasketPublishGuardError('Basket must have pickup times set to be published');
  }

  if (basket.pickupEnd <= basket.pickupStart) {
    throw new BasketPublishGuardError('Pickup end time must be after pickup start time');
  }
}

/**
 * Applies a state transition to a basket (pure function — returns a new basket).
 *
 * For DRAFT → PUBLISHED, also runs the publish guard.
 *
 * Throws InvalidBasketTransitionError if the transition is not allowed.
 * Throws BasketPublishGuardError if publish guards fail.
 */
export function transition(basket: Basket, to: BasketStatus): Basket {
  if (!canTransition(basket.status, to)) {
    throw new InvalidBasketTransitionError(basket.status, to);
  }

  if (to === BasketStatus.PUBLISHED) {
    assertPublishable(basket);
  }

  return { ...basket, status: to };
}

/**
 * Returns all valid target statuses from a given status.
 */
export function getValidTransitions(from: BasketStatus): BasketStatus[] {
  return Array.from(VALID_TRANSITIONS[from] ?? []);
}
