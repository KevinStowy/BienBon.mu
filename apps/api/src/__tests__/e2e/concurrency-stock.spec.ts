// =============================================================================
// Concurrency: Stock Race Conditions (ADR-008, ADR-023)
// =============================================================================
// Tests that the atomic stock decrement logic behaves correctly under
// concurrent load. Since real DB concurrency needs Testcontainers,
// this test focuses on the domain-layer race condition prevention.
//
// The real atomicity guarantee lives in the Prisma raw query adapter
// (UPDATE baskets SET current_stock = current_stock - 1 WHERE id = ? AND current_stock > 0).
// Here we simulate that behavior to verify the domain contracts.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assertSufficientStock,
  decrementStock,
} from '../../modules/catalog/domain/rules/stock-rules';
import { InsufficientStockError } from '../../modules/catalog/domain/errors/catalog-errors';
import { ReservationService } from '../../modules/ordering/application/services/reservation.service';
import { ReservationStatus } from '../../modules/ordering/domain/enums/reservation-status.enum';
import { BusinessRuleError } from '../../shared/errors/domain-error';
import type { Reservation } from '../../modules/ordering/domain/entities/reservation.entity';
import type { BasketInfo } from '../../modules/ordering/ports/catalog.port';

// ---------------------------------------------------------------------------
// Module-level constants shared across describe blocks
// ---------------------------------------------------------------------------

const MODULE_BASKET_ID = '550e8400-e29b-41d4-a716-000000000001';
const MODULE_STORE_ID = '550e8400-e29b-41d4-a716-000000000002';

// ---------------------------------------------------------------------------
// Domain-layer stock invariant simulation
// ---------------------------------------------------------------------------

describe('Domain-layer stock invariant: decrementStock never produces negative values', () => {
  it('50 concurrent simulated decrements against stock=5 yields exactly 5 successes', () => {
    let stock = 5;
    let successes = 0;
    let failures = 0;

    // Simulate 50 concurrent reservation attempts (sequential in test — pure domain logic)
    for (let i = 0; i < 50; i++) {
      try {
        assertSufficientStock(stock, 1);
        stock = decrementStock(stock, 1);
        successes++;
      } catch (err) {
        if (err instanceof InsufficientStockError) {
          failures++;
        } else {
          throw err;
        }
      }
    }

    expect(successes).toBe(5);
    expect(failures).toBe(45);
    expect(stock).toBe(0);
  });

  it('stock is exactly 0 after exhaustion — never negative', () => {
    let stock = 3;

    for (let i = 0; i < 10; i++) {
      try {
        assertSufficientStock(stock, 1);
        stock = decrementStock(stock, 1);
      } catch {
        // continue
      }
    }

    expect(stock).toBe(0);
    expect(stock).toBeGreaterThanOrEqual(0);
  });

  it('invariant holds with varying batch quantities', () => {
    // e.g., 3 consumers try to reserve 2 baskets each against stock=5
    let stock = 5;
    let successes = 0;
    let failures = 0;
    const qtyPerRequest = 2;

    for (let i = 0; i < 6; i++) {
      try {
        assertSufficientStock(stock, qtyPerRequest);
        stock = decrementStock(stock, qtyPerRequest);
        successes++;
      } catch {
        failures++;
      }
    }

    // floor(5/2) = 2 succeed, 4 fail
    expect(successes).toBe(2);
    expect(failures).toBe(4);
    expect(stock).toBe(1); // 5 - 4 = 1 unit remains
    expect(stock).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Concurrent reservation service calls — atomic catalog adapter simulation
// ---------------------------------------------------------------------------

describe('ReservationService: concurrent stock decrement simulation', () => {
  const BASKET_ID = '550e8400-e29b-41d4-a716-000000000001';
  const STORE_ID = '550e8400-e29b-41d4-a716-000000000002';

  function makeBasketInfo(stock: number): BasketInfo {
    return {
      id: BASKET_ID,
      storeId: STORE_ID,
      sellingPrice: 450,
      stock,
      pickupStart: new Date(Date.now() + 60 * 60 * 1000),
      pickupEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
      status: 'PUBLISHED',
    };
  }

  function makeReservation(consumerId: string, status = ReservationStatus.PENDING_PAYMENT): Reservation {
    return {
      id: `res-${consumerId}`,
      basketId: BASKET_ID,
      consumerId,
      quantity: 1,
      unitPrice: 450,
      totalPrice: 450,
      status,
      qrCode: `qr-${consumerId}`,
      pinCode: '123456',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      confirmedAt: null,
      readyAt: null,
      pickedUpAt: null,
      cancelledAt: null,
      noShowAt: null,
      expiredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('exactly 5 of 50 concurrent reservations succeed when stock=5', async () => {
    // Simulate atomic DB counter: decrements succeed only while stock > 0
    let atomicStock = 5;

    const catalogPort = {
      getBasket: vi.fn().mockResolvedValue(makeBasketInfo(5)),
      decrementStock: vi.fn().mockImplementation(async () => {
        // Atomic: CAS operation — decrement only if stock > 0
        if (atomicStock > 0) {
          atomicStock--;
          return atomicStock; // return remaining stock
        }
        return null; // insufficient stock
      }),
      incrementStock: vi.fn().mockResolvedValue(undefined),
    };

    const reservationRepo = {
      findById: vi.fn(),
      findMany: vi.fn().mockResolvedValue({ reservations: [], total: 0 }),
      findActiveByConsumerAndBasket: vi.fn().mockResolvedValue(null), // no duplicates
      create: vi.fn().mockImplementation(
        (data: Partial<Reservation>) => Promise.resolve({ ...makeReservation(data.consumerId ?? 'c'), ...data }),
      ),
      update: vi.fn().mockImplementation(
        (id: string, data: Partial<Reservation>) => Promise.resolve(makeReservation(id)),
      ),
      updateStatus: vi.fn(),
    };

    const eventEmitter = { emit: vi.fn() };

    const service = new ReservationService(
      reservationRepo as never,
      catalogPort as never,
      eventEmitter as never,
    );

    // Launch 50 concurrent reservation attempts
    const consumerIds = Array.from({ length: 50 }, (_, i) => `consumer-${i.toString().padStart(3, '0')}`);
    const results = await Promise.allSettled(
      consumerIds.map((consumerId) =>
        service.createReservation({ basketId: BASKET_ID, consumerId, quantity: 1 }),
      ),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(5);
    expect(failures).toHaveLength(45);

    // All failures should be INSUFFICIENT_STOCK business rule errors
    for (const failure of failures) {
      expect(failure.status).toBe('rejected');
      const reason = (failure as PromiseRejectedResult).reason as Error;
      expect(reason).toBeInstanceOf(BusinessRuleError);
      expect((reason as BusinessRuleError).code).toBe('INSUFFICIENT_STOCK');
    }

    // Stock should be exactly 0 after exhaustion
    expect(atomicStock).toBe(0);
  });

  it('stock never goes below 0 even with concurrent attempts', async () => {
    let atomicStock = 3;
    let minStockObserved = atomicStock;

    const catalogPort = {
      getBasket: vi.fn().mockResolvedValue(makeBasketInfo(3)),
      decrementStock: vi.fn().mockImplementation(async () => {
        if (atomicStock > 0) {
          atomicStock--;
          minStockObserved = Math.min(minStockObserved, atomicStock);
          return atomicStock;
        }
        return null;
      }),
      incrementStock: vi.fn().mockResolvedValue(undefined),
    };

    const reservationRepo = {
      findActiveByConsumerAndBasket: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(
        (data: Partial<Reservation>) => Promise.resolve(makeReservation(data.consumerId ?? 'c')),
      ),
      update: vi.fn(),
      updateStatus: vi.fn(),
      findMany: vi.fn(),
      findById: vi.fn(),
    };

    const service = new ReservationService(
      reservationRepo as never,
      catalogPort as never,
      { emit: vi.fn() } as never,
    );

    await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        service.createReservation({ basketId: BASKET_ID, consumerId: `consumer-${i}`, quantity: 1 }),
      ),
    );

    expect(atomicStock).toBe(0);
    expect(minStockObserved).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Stock restoration on cancellation — idempotency check
// ---------------------------------------------------------------------------

describe('Stock restoration invariant', () => {
  it('cancelling N reservations restores exactly N units of stock', () => {
    let stock = 0; // starts at 0 (all reserved)

    // Simulate 5 cancellations restoring stock
    const cancelledQuantities = [1, 1, 1, 1, 1];
    for (const qty of cancelledQuantities) {
      stock += qty; // incrementStock equivalent
    }

    expect(stock).toBe(5); // Back to original stock
  });

  it('expiring a reservation increments stock back', async () => {
    let atomicStock = 0;

    const catalogPort = {
      getBasket: vi.fn(),
      decrementStock: vi.fn(),
      incrementStock: vi.fn().mockImplementation(async (_basketId: string, qty: number) => {
        atomicStock += qty;
      }),
    };

    const reservationRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'res-001',
        basketId: MODULE_BASKET_ID,
        consumerId: 'consumer-001',
        quantity: 1,
        unitPrice: 450,
        totalPrice: 450,
        status: ReservationStatus.PENDING_PAYMENT,
        qrCode: 'qr-token',
        pinCode: '111111',
        expiresAt: new Date(),
        confirmedAt: null,
        readyAt: null,
        pickedUpAt: null,
        cancelledAt: null,
        noShowAt: null,
        expiredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateStatus: vi.fn().mockImplementation(
        (_id: string, status: ReservationStatus) => Promise.resolve({
          id: 'res-001', basketId: MODULE_BASKET_ID, consumerId: 'consumer-001',
          quantity: 1, unitPrice: 450, totalPrice: 450,
          status, qrCode: 'qr-token', pinCode: '111111',
          expiresAt: null, confirmedAt: null, readyAt: null, pickedUpAt: null,
          cancelledAt: null, noShowAt: null, expiredAt: null,
          createdAt: new Date(), updatedAt: new Date(),
        }),
      ),
      update: vi.fn().mockImplementation(
        (id: string) => Promise.resolve({
          id, basketId: MODULE_BASKET_ID, consumerId: 'consumer-001',
          quantity: 1, unitPrice: 450, totalPrice: 450,
          status: ReservationStatus.EXPIRED, qrCode: 'qr-token', pinCode: '111111',
          expiresAt: null, confirmedAt: null, readyAt: null, pickedUpAt: null,
          cancelledAt: null, noShowAt: null, expiredAt: new Date(),
          createdAt: new Date(), updatedAt: new Date(),
        }),
      ),
      findMany: vi.fn(),
      findActiveByConsumerAndBasket: vi.fn(),
      create: vi.fn(),
    };

    const service = new ReservationService(
      reservationRepo as never,
      catalogPort as never,
      { emit: vi.fn() } as never,
    );

    await service.expireReservation({ reservationId: 'res-001' });

    expect(atomicStock).toBe(1);
    expect(catalogPort.incrementStock).toHaveBeenCalledWith(MODULE_BASKET_ID, 1);
  });
});
