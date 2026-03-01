// =============================================================================
// Basket State Machine — tests (ADR-017, ADR-023)
// =============================================================================
// Tests `canTransition`, `assertPublishable`, and `transition` from basket-state-machine.ts.
// Exercises every valid arc, every invalid arc, and the publish guard in detail.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertPublishable,
  transition,
  getValidTransitions,
} from '../rules/basket-state-machine';
import { BasketStatus } from '../enums/basket-status.enum';
import { InvalidBasketTransitionError, BasketPublishGuardError } from '../errors/catalog-errors';
import type { Basket } from '../entities/basket.entity';

// ---------------------------------------------------------------------------
// Test factory
// ---------------------------------------------------------------------------

function makePublishableBasket(overrides: Partial<Basket> = {}): Basket {
  const pickupStart = new Date('2026-03-15T09:00:00Z');
  const pickupEnd = new Date('2026-03-15T11:00:00Z');

  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    storeId: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Surprise Basket',
    description: 'A surprise basket of unsold goods',
    originalPrice: 1000,
    sellingPrice: 450,
    quantity: 5,
    stock: 5,
    categoryId: '550e8400-e29b-41d4-a716-446655440003',
    photoUrl: null,
    pickupStart,
    pickupEnd,
    status: BasketStatus.DRAFT,
    tagIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// canTransition — pure boolean guard
// ---------------------------------------------------------------------------

describe('canTransition', () => {
  describe('DRAFT', () => {
    it('allows DRAFT -> PUBLISHED', () => {
      expect(canTransition(BasketStatus.DRAFT, BasketStatus.PUBLISHED)).toBe(true);
    });

    it('allows DRAFT -> ARCHIVED', () => {
      expect(canTransition(BasketStatus.DRAFT, BasketStatus.ARCHIVED)).toBe(true);
    });

    it('rejects DRAFT -> SOLD_OUT', () => {
      expect(canTransition(BasketStatus.DRAFT, BasketStatus.SOLD_OUT)).toBe(false);
    });

    it('rejects DRAFT -> PICKUP_WINDOW', () => {
      expect(canTransition(BasketStatus.DRAFT, BasketStatus.PICKUP_WINDOW)).toBe(false);
    });

    it('rejects DRAFT -> ENDED', () => {
      expect(canTransition(BasketStatus.DRAFT, BasketStatus.ENDED)).toBe(false);
    });

    it('rejects DRAFT -> CANCELLED', () => {
      expect(canTransition(BasketStatus.DRAFT, BasketStatus.CANCELLED)).toBe(false);
    });
  });

  describe('PUBLISHED', () => {
    it('allows PUBLISHED -> SOLD_OUT (stock reaches 0)', () => {
      expect(canTransition(BasketStatus.PUBLISHED, BasketStatus.SOLD_OUT)).toBe(true);
    });

    it('allows PUBLISHED -> PICKUP_WINDOW (window opens)', () => {
      expect(canTransition(BasketStatus.PUBLISHED, BasketStatus.PICKUP_WINDOW)).toBe(true);
    });

    it('allows PUBLISHED -> CANCELLED (partner cancels)', () => {
      expect(canTransition(BasketStatus.PUBLISHED, BasketStatus.CANCELLED)).toBe(true);
    });

    it('allows PUBLISHED -> ARCHIVED', () => {
      expect(canTransition(BasketStatus.PUBLISHED, BasketStatus.ARCHIVED)).toBe(true);
    });

    it('rejects PUBLISHED -> DRAFT (cannot go back to draft)', () => {
      expect(canTransition(BasketStatus.PUBLISHED, BasketStatus.DRAFT)).toBe(false);
    });

    it('rejects PUBLISHED -> ENDED (must go through PICKUP_WINDOW)', () => {
      expect(canTransition(BasketStatus.PUBLISHED, BasketStatus.ENDED)).toBe(false);
    });
  });

  describe('SOLD_OUT', () => {
    it('allows SOLD_OUT -> PUBLISHED (stock replenished)', () => {
      expect(canTransition(BasketStatus.SOLD_OUT, BasketStatus.PUBLISHED)).toBe(true);
    });

    it('allows SOLD_OUT -> PICKUP_WINDOW', () => {
      expect(canTransition(BasketStatus.SOLD_OUT, BasketStatus.PICKUP_WINDOW)).toBe(true);
    });

    it('rejects SOLD_OUT -> DRAFT (backward transition not allowed)', () => {
      expect(canTransition(BasketStatus.SOLD_OUT, BasketStatus.DRAFT)).toBe(false);
    });

    it('rejects SOLD_OUT -> ENDED', () => {
      expect(canTransition(BasketStatus.SOLD_OUT, BasketStatus.ENDED)).toBe(false);
    });
  });

  describe('PICKUP_WINDOW', () => {
    it('allows PICKUP_WINDOW -> ENDED (window closes)', () => {
      expect(canTransition(BasketStatus.PICKUP_WINDOW, BasketStatus.ENDED)).toBe(true);
    });

    it('allows PICKUP_WINDOW -> SOLD_OUT', () => {
      expect(canTransition(BasketStatus.PICKUP_WINDOW, BasketStatus.SOLD_OUT)).toBe(true);
    });

    it('rejects PICKUP_WINDOW -> PUBLISHED', () => {
      expect(canTransition(BasketStatus.PICKUP_WINDOW, BasketStatus.PUBLISHED)).toBe(false);
    });

    it('rejects PICKUP_WINDOW -> CANCELLED', () => {
      expect(canTransition(BasketStatus.PICKUP_WINDOW, BasketStatus.CANCELLED)).toBe(false);
    });
  });

  describe('ENDED', () => {
    it('allows ENDED -> ARCHIVED (archival after end)', () => {
      expect(canTransition(BasketStatus.ENDED, BasketStatus.ARCHIVED)).toBe(true);
    });

    it('rejects ENDED -> PUBLISHED (cannot re-publish after end)', () => {
      expect(canTransition(BasketStatus.ENDED, BasketStatus.PUBLISHED)).toBe(false);
    });

    it('rejects ENDED -> DRAFT', () => {
      expect(canTransition(BasketStatus.ENDED, BasketStatus.DRAFT)).toBe(false);
    });
  });

  describe('CANCELLED', () => {
    it('allows CANCELLED -> ARCHIVED', () => {
      expect(canTransition(BasketStatus.CANCELLED, BasketStatus.ARCHIVED)).toBe(true);
    });

    it('rejects CANCELLED -> PUBLISHED (cannot resurrect cancelled basket)', () => {
      expect(canTransition(BasketStatus.CANCELLED, BasketStatus.PUBLISHED)).toBe(false);
    });

    it('rejects CANCELLED -> DRAFT', () => {
      expect(canTransition(BasketStatus.CANCELLED, BasketStatus.DRAFT)).toBe(false);
    });
  });

  describe('ARCHIVED', () => {
    it('is a terminal state — rejects all outgoing transitions', () => {
      for (const status of Object.values(BasketStatus)) {
        expect(canTransition(BasketStatus.ARCHIVED, status)).toBe(false);
      }
    });

    it('getValidTransitions returns empty array for ARCHIVED', () => {
      expect(getValidTransitions(BasketStatus.ARCHIVED)).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// assertPublishable — publish guard
// ---------------------------------------------------------------------------

describe('assertPublishable', () => {
  it('passes for a fully-configured publishable basket', () => {
    const basket = makePublishableBasket();
    expect(() => assertPublishable(basket)).not.toThrow();
  });

  it('throws when title is empty string', () => {
    const basket = makePublishableBasket({ title: '' });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when title is whitespace only', () => {
    const basket = makePublishableBasket({ title: '   ' });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when originalPrice is 0', () => {
    const basket = makePublishableBasket({ originalPrice: 0 });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when sellingPrice is 0', () => {
    const basket = makePublishableBasket({ sellingPrice: 0 });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when stock is 0 (nothing to sell)', () => {
    const basket = makePublishableBasket({ stock: 0 });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when pickupStart is missing', () => {
    const basket = makePublishableBasket({ pickupStart: undefined as unknown as Date });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when pickupEnd is missing', () => {
    const basket = makePublishableBasket({ pickupEnd: undefined as unknown as Date });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when pickupEnd equals pickupStart (zero-duration window)', () => {
    const t = new Date('2026-03-15T09:00:00Z');
    const basket = makePublishableBasket({ pickupStart: t, pickupEnd: t });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });

  it('throws when pickupEnd is before pickupStart', () => {
    const pickupStart = new Date('2026-03-15T11:00:00Z');
    const pickupEnd = new Date('2026-03-15T09:00:00Z');
    const basket = makePublishableBasket({ pickupStart, pickupEnd });
    expect(() => assertPublishable(basket)).toThrow(BasketPublishGuardError);
  });
});

// ---------------------------------------------------------------------------
// transition — applies state changes and enforces guards
// ---------------------------------------------------------------------------

describe('transition (stateful)', () => {
  it('DRAFT -> PUBLISHED succeeds for a valid basket', () => {
    const basket = makePublishableBasket({ status: BasketStatus.DRAFT });
    const updated = transition(basket, BasketStatus.PUBLISHED);
    expect(updated.status).toBe(BasketStatus.PUBLISHED);
  });

  it('DRAFT -> PUBLISHED returns a new object (immutability)', () => {
    const basket = makePublishableBasket({ status: BasketStatus.DRAFT });
    const updated = transition(basket, BasketStatus.PUBLISHED);
    expect(updated).not.toBe(basket);
    expect(basket.status).toBe(BasketStatus.DRAFT); // original unchanged
  });

  it('DRAFT -> PUBLISHED throws when basket is incomplete', () => {
    const basket = makePublishableBasket({ status: BasketStatus.DRAFT, stock: 0 });
    expect(() => transition(basket, BasketStatus.PUBLISHED)).toThrow(BasketPublishGuardError);
  });

  it('PUBLISHED -> SOLD_OUT succeeds', () => {
    const basket = makePublishableBasket({ status: BasketStatus.PUBLISHED });
    const updated = transition(basket, BasketStatus.SOLD_OUT);
    expect(updated.status).toBe(BasketStatus.SOLD_OUT);
  });

  it('SOLD_OUT -> PUBLISHED succeeds (stock replenished)', () => {
    const basket = makePublishableBasket({ status: BasketStatus.SOLD_OUT });
    const updated = transition(basket, BasketStatus.PUBLISHED);
    expect(updated.status).toBe(BasketStatus.PUBLISHED);
  });

  it('SOLD_OUT -> PUBLISHED runs publish guard again', () => {
    const basket = makePublishableBasket({ status: BasketStatus.SOLD_OUT, stock: 0 });
    expect(() => transition(basket, BasketStatus.PUBLISHED)).toThrow(BasketPublishGuardError);
  });

  it('DRAFT -> SOLD_OUT throws InvalidBasketTransitionError', () => {
    const basket = makePublishableBasket({ status: BasketStatus.DRAFT });
    expect(() => transition(basket, BasketStatus.SOLD_OUT)).toThrow(InvalidBasketTransitionError);
  });

  it('ARCHIVED -> PUBLISHED throws InvalidBasketTransitionError (terminal state)', () => {
    const basket = makePublishableBasket({ status: BasketStatus.ARCHIVED });
    expect(() => transition(basket, BasketStatus.PUBLISHED)).toThrow(InvalidBasketTransitionError);
  });

  it('ENDED -> PUBLISHED throws InvalidBasketTransitionError (no comeback)', () => {
    const basket = makePublishableBasket({ status: BasketStatus.ENDED });
    expect(() => transition(basket, BasketStatus.PUBLISHED)).toThrow(InvalidBasketTransitionError);
  });

  it('error message identifies the invalid from-to pair', () => {
    const basket = makePublishableBasket({ status: BasketStatus.EXPIRED as unknown as BasketStatus });
    // ARCHIVED is properly terminal
    const archived = makePublishableBasket({ status: BasketStatus.ARCHIVED });
    let error: unknown;
    try {
      transition(archived, BasketStatus.DRAFT);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(InvalidBasketTransitionError);
    expect((error as Error).message).toContain('ARCHIVED');
    expect((error as Error).message).toContain('DRAFT');
  });
});
