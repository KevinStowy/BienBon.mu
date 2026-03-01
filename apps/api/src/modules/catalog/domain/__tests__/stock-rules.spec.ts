// =============================================================================
// Stock Rules — unit tests (ADR-023, ADR-008)
// =============================================================================
// Tests pure stock-rule functions: assertValidPrice, assertSufficientStock,
// decrementStock, and incrementStock.
//
// Anti-triviality: tests verify invariants (stock never goes negative, price
// constraint is ≤50%), edge cases (exact boundary values), and error semantics.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  assertValidPrice,
  assertSufficientStock,
  decrementStock,
  incrementStock,
} from '../rules/stock-rules';
import { InsufficientStockError, InvalidBasketPriceError } from '../errors/catalog-errors';

// ---------------------------------------------------------------------------
// assertValidPrice — selling price must be ≤50% of original price (ADR-003)
// ---------------------------------------------------------------------------

describe('assertValidPrice', () => {
  it('passes when selling price is exactly 50% of original', () => {
    expect(() => assertValidPrice(1000, 500)).not.toThrow();
  });

  it('passes when selling price is well below 50%', () => {
    expect(() => assertValidPrice(1000, 100)).not.toThrow();
  });

  it('passes when selling price is 1 MUR below the 50% cap', () => {
    expect(() => assertValidPrice(1000, 499)).not.toThrow();
  });

  it('throws InvalidBasketPriceError when selling price is 1 MUR above the 50% cap', () => {
    expect(() => assertValidPrice(1000, 501)).toThrow(InvalidBasketPriceError);
  });

  it('throws when selling price equals original price (100% is never valid)', () => {
    expect(() => assertValidPrice(1000, 1000)).toThrow(InvalidBasketPriceError);
  });

  it('throws when selling price is above original price', () => {
    expect(() => assertValidPrice(1000, 1200)).toThrow(InvalidBasketPriceError);
  });

  it('error message contains both prices for debugging', () => {
    let error: unknown;
    try {
      assertValidPrice(1000, 600);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(InvalidBasketPriceError);
    expect((error as Error).message).toContain('600');
    expect((error as Error).message).toContain('1000');
  });

  it('invariant: for any price >= 1, selling price at exactly 50% is always valid', () => {
    // Property-style loop across varied price points
    const prices = [10, 50, 100, 200, 500, 1000, 5000, 10000];
    for (const p of prices) {
      expect(() => assertValidPrice(p, Math.floor(p * 0.5))).not.toThrow();
    }
  });

  it('invariant: selling price > 50% always throws', () => {
    const prices = [10, 100, 500, 1000];
    for (const p of prices) {
      expect(() => assertValidPrice(p, Math.ceil(p * 0.5) + 1)).toThrow(InvalidBasketPriceError);
    }
  });
});

// ---------------------------------------------------------------------------
// assertSufficientStock
// ---------------------------------------------------------------------------

describe('assertSufficientStock', () => {
  it('passes when current stock equals requested quantity', () => {
    expect(() => assertSufficientStock(5, 5)).not.toThrow();
  });

  it('passes when current stock exceeds requested quantity', () => {
    expect(() => assertSufficientStock(10, 1)).not.toThrow();
  });

  it('throws InsufficientStockError when current stock is 0', () => {
    expect(() => assertSufficientStock(0, 1)).toThrow(InsufficientStockError);
  });

  it('throws InsufficientStockError when quantity exceeds stock by 1', () => {
    expect(() => assertSufficientStock(4, 5)).toThrow(InsufficientStockError);
  });

  it('throws an error when quantity is 0 (invalid operation)', () => {
    expect(() => assertSufficientStock(10, 0)).toThrow();
  });

  it('throws an error when quantity is negative', () => {
    expect(() => assertSufficientStock(10, -1)).toThrow();
  });

  it('error message includes available and requested quantities', () => {
    let error: unknown;
    try {
      assertSufficientStock(3, 7);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(InsufficientStockError);
    expect((error as Error).message).toContain('3');
    expect((error as Error).message).toContain('7');
  });

  it('invariant: stock can never go negative through assertSufficientStock', () => {
    // If assertSufficientStock passes, decrementStock will never produce negative stock
    const scenarios = [
      { stock: 1, qty: 1 },
      { stock: 5, qty: 5 },
      { stock: 100, qty: 99 },
    ];
    for (const { stock, qty } of scenarios) {
      expect(() => assertSufficientStock(stock, qty)).not.toThrow();
      const remaining = decrementStock(stock, qty);
      expect(remaining).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// decrementStock — pure arithmetic, assumes guard already passed
// ---------------------------------------------------------------------------

describe('decrementStock', () => {
  it('returns stock minus quantity', () => {
    expect(decrementStock(10, 3)).toBe(7);
  });

  it('returns 0 when all stock is consumed', () => {
    expect(decrementStock(5, 5)).toBe(0);
  });

  it('is idempotent in the sense that calling twice with correct stock gives consistent results', () => {
    const stock1 = decrementStock(10, 4);
    const stock2 = decrementStock(stock1, 4);
    expect(stock1).toBe(6);
    expect(stock2).toBe(2);
  });

  it('invariant: decrementStock(n, n) always equals 0', () => {
    for (const n of [1, 5, 10, 50, 100]) {
      expect(decrementStock(n, n)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// incrementStock — stock restore on cancellation/expiry
// ---------------------------------------------------------------------------

describe('incrementStock', () => {
  it('returns stock plus quantity', () => {
    expect(incrementStock(3, 2)).toBe(5);
  });

  it('increments from 0 (fully sold-out basket gets a unit back)', () => {
    expect(incrementStock(0, 1)).toBe(1);
  });

  it('throws when increment quantity is 0', () => {
    expect(() => incrementStock(5, 0)).toThrow();
  });

  it('throws when increment quantity is negative', () => {
    expect(() => incrementStock(5, -1)).toThrow();
  });

  it('invariant: decrement then increment restores original stock', () => {
    const original = 10;
    const qty = 3;
    const afterDecrement = decrementStock(original, qty);
    const restored = incrementStock(afterDecrement, qty);
    expect(restored).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// Concurrent decrement simulation — stock cannot go negative
// ---------------------------------------------------------------------------

describe('Stock concurrency invariant (simulated sequential)', () => {
  it('running 10 decrements of 1 against a stock of 5 leaves exactly 0 succeeded and 5 failed', () => {
    let currentStock = 5;
    let succeeded = 0;
    let failed = 0;

    // Simulate sequential atomic operations (real atomicity is in the DB layer)
    for (let i = 0; i < 10; i++) {
      try {
        assertSufficientStock(currentStock, 1);
        currentStock = decrementStock(currentStock, 1);
        succeeded++;
      } catch {
        failed++;
      }
    }

    expect(succeeded).toBe(5);
    expect(failed).toBe(5);
    expect(currentStock).toBe(0);
    expect(currentStock).toBeGreaterThanOrEqual(0); // Never negative
  });
});
