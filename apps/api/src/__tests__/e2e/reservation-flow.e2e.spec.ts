// =============================================================================
// Reservation Flow — E2E orchestration test (ADR-023)
// =============================================================================
// Tests the complete reservation lifecycle by orchestrating ReservationService
// with mocked ports (CatalogPort, ReservationRepositoryPort, EventEmitter2).
//
// Flow tested:
//   1. Consumer reserves a basket (PENDING_PAYMENT)
//   2. Payment confirmed (CONFIRMED) — consumer receives QR/PIN
//   3. Partner marks basket ready (READY)
//   4. Consumer validated at pickup (PICKED_UP)
//   5. Consumer cannot cancel after READY (guard tested)
//   6. Reservation expiry restores stock (EXPIRED)
//
// No real DB. All persistence is mocked.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from '../../modules/ordering/application/services/reservation.service';
import { ReservationStatus } from '../../modules/ordering/domain/enums/reservation-status.enum';
import {
  DuplicateReservationError,
  ReservationNotFoundError,
  InvalidPickupCodeError,
  CancellationWindowExpiredError,
} from '../../modules/ordering/domain/errors/ordering-errors';
import { BusinessRuleError } from '../../shared/errors/domain-error';
import type { Reservation } from '../../modules/ordering/domain/entities/reservation.entity';
import type { BasketInfo } from '../../modules/ordering/ports/catalog.port';
import { ORDERING_EVENTS } from '../../modules/ordering/domain/events/ordering-events';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

const BASKET_ID = '550e8400-e29b-41d4-a716-000000000001';
const CONSUMER_ID = '550e8400-e29b-41d4-a716-000000000002';
const RESERVATION_ID = '550e8400-e29b-41d4-a716-000000000003';
const STORE_ID = '550e8400-e29b-41d4-a716-000000000004';

function makeBasketInfo(overrides: Partial<BasketInfo> = {}): BasketInfo {
  const now = new Date();
  return {
    id: BASKET_ID,
    storeId: STORE_ID,
    sellingPrice: 450,
    stock: 5,
    pickupStart: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
    pickupEnd: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3 hours from now
    status: 'PUBLISHED',
    ...overrides,
  };
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: RESERVATION_ID,
    basketId: BASKET_ID,
    consumerId: CONSUMER_ID,
    quantity: 1,
    unitPrice: 450,
    totalPrice: 450,
    status: ReservationStatus.PENDING_PAYMENT,
    qrCode: 'qr-uuid-token-abc123',
    pinCode: '042837',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    confirmedAt: null,
    readyAt: null,
    pickedUpAt: null,
    cancelledAt: null,
    noShowAt: null,
    expiredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

function makeCatalogPort() {
  return {
    getBasket: vi.fn<[], Promise<BasketInfo | null>>().mockResolvedValue(makeBasketInfo()),
    decrementStock: vi.fn<[], Promise<number | null>>().mockResolvedValue(4),
    incrementStock: vi.fn<[], Promise<void>>().mockResolvedValue(undefined),
  };
}

function makeReservationRepo() {
  const reservation = makeReservation();
  return {
    findById: vi.fn<[], Promise<Reservation | null>>().mockResolvedValue(reservation),
    findMany: vi.fn().mockResolvedValue({ reservations: [], total: 0 }),
    findActiveByConsumerAndBasket: vi.fn<[], Promise<Reservation | null>>().mockResolvedValue(null),
    create: vi.fn<[], Promise<Reservation>>().mockResolvedValue(reservation),
    update: vi.fn<[], Promise<Reservation>>().mockResolvedValue(reservation),
    updateStatus: vi.fn<[], Promise<Reservation>>().mockImplementation(
      (_id: string, status: ReservationStatus) =>
        Promise.resolve(makeReservation({ status })),
    ),
  };
}

function makeEventEmitter() {
  return { emit: vi.fn() };
}

// ---------------------------------------------------------------------------
// Step 1: Consumer reserves a basket
// ---------------------------------------------------------------------------

describe('Step 1: Consumer reserves a basket (PENDING_PAYMENT)', () => {
  let service: ReservationService;
  let catalogPort: ReturnType<typeof makeCatalogPort>;
  let reservationRepo: ReturnType<typeof makeReservationRepo>;
  let eventEmitter: ReturnType<typeof makeEventEmitter>;

  beforeEach(() => {
    catalogPort = makeCatalogPort();
    reservationRepo = makeReservationRepo();
    eventEmitter = makeEventEmitter();
    service = new ReservationService(
      reservationRepo as never,
      catalogPort as never,
      eventEmitter as never,
    );
  });

  it('creates a reservation in PENDING_PAYMENT status with QR and PIN codes', async () => {
    const reservation = await service.createReservation({
      basketId: BASKET_ID,
      consumerId: CONSUMER_ID,
      quantity: 1,
    });

    expect(reservation.status).toBe(ReservationStatus.PENDING_PAYMENT);
    expect(reservation.qrCode).toBeDefined();
    expect(reservation.pinCode).toBeDefined();
    expect(reservation.pinCode).toHaveLength(6);
  });

  it('decrements basket stock on successful reservation creation', async () => {
    await service.createReservation({
      basketId: BASKET_ID,
      consumerId: CONSUMER_ID,
      quantity: 1,
    });

    expect(catalogPort.decrementStock).toHaveBeenCalledWith(BASKET_ID, 1);
  });

  it('emits RESERVATION_CREATED domain event', async () => {
    await service.createReservation({
      basketId: BASKET_ID,
      consumerId: CONSUMER_ID,
      quantity: 1,
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ORDERING_EVENTS.RESERVATION_CREATED,
      expect.objectContaining({
        basketId: BASKET_ID,
        consumerId: CONSUMER_ID,
      }),
    );
  });

  it('throws BusinessRuleError when basket does not exist', async () => {
    catalogPort.getBasket.mockResolvedValueOnce(null);

    await expect(
      service.createReservation({ basketId: BASKET_ID, consumerId: CONSUMER_ID, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('throws BusinessRuleError when basket is not PUBLISHED or PICKUP_WINDOW', async () => {
    catalogPort.getBasket.mockResolvedValueOnce(makeBasketInfo({ status: 'SOLD_OUT' }));

    await expect(
      service.createReservation({ basketId: BASKET_ID, consumerId: CONSUMER_ID, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('throws DuplicateReservationError when consumer already has an active reservation', async () => {
    reservationRepo.findActiveByConsumerAndBasket.mockResolvedValueOnce(makeReservation());

    await expect(
      service.createReservation({ basketId: BASKET_ID, consumerId: CONSUMER_ID, quantity: 1 }),
    ).rejects.toThrow(DuplicateReservationError);
  });

  it('throws BusinessRuleError when stock is insufficient (decrementStock returns null)', async () => {
    catalogPort.decrementStock.mockResolvedValueOnce(null);

    await expect(
      service.createReservation({ basketId: BASKET_ID, consumerId: CONSUMER_ID, quantity: 1 }),
    ).rejects.toThrow(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// Step 2: Payment confirmed → CONFIRMED
// ---------------------------------------------------------------------------

describe('Step 2: Payment is confirmed (PENDING_PAYMENT -> CONFIRMED)', () => {
  let service: ReservationService;
  let reservationRepo: ReturnType<typeof makeReservationRepo>;
  let eventEmitter: ReturnType<typeof makeEventEmitter>;

  beforeEach(() => {
    reservationRepo = makeReservationRepo();
    eventEmitter = makeEventEmitter();
    service = new ReservationService(
      reservationRepo as never,
      makeCatalogPort() as never,
      eventEmitter as never,
    );
  });

  it('transitions reservation from PENDING_PAYMENT to CONFIRMED', async () => {
    reservationRepo.findById.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.PENDING_PAYMENT }),
    );
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CONFIRMED }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CONFIRMED, confirmedAt: new Date() }),
    );

    const confirmed = await service.confirmReservation({
      reservationId: RESERVATION_ID,
      actorId: 'payment-system',
      actorRole: 'system',
    });

    expect(reservationRepo.updateStatus).toHaveBeenCalledWith(
      RESERVATION_ID,
      ReservationStatus.CONFIRMED,
      expect.objectContaining({ event: 'PAYMENT_SUCCESS' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ORDERING_EVENTS.RESERVATION_CONFIRMED,
      expect.objectContaining({ reservationId: RESERVATION_ID }),
    );
  });

  it('throws ReservationNotFoundError when reservation does not exist', async () => {
    reservationRepo.findById.mockResolvedValueOnce(null);

    await expect(
      service.confirmReservation({
        reservationId: 'no-such-id',
        actorId: 'system',
        actorRole: 'system',
      }),
    ).rejects.toThrow(ReservationNotFoundError);
  });
});

// ---------------------------------------------------------------------------
// Step 3: Partner marks basket ready (CONFIRMED -> READY)
// ---------------------------------------------------------------------------

describe('Step 3: Partner marks basket ready (CONFIRMED -> READY)', () => {
  let service: ReservationService;
  let reservationRepo: ReturnType<typeof makeReservationRepo>;
  let eventEmitter: ReturnType<typeof makeEventEmitter>;

  beforeEach(() => {
    reservationRepo = makeReservationRepo();
    eventEmitter = makeEventEmitter();
    service = new ReservationService(
      reservationRepo as never,
      makeCatalogPort() as never,
      eventEmitter as never,
    );
  });

  it('transitions reservation from CONFIRMED to READY', async () => {
    reservationRepo.findById.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CONFIRMED }),
    );
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.READY }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.READY, readyAt: new Date() }),
    );

    await service.markReady({
      reservationId: RESERVATION_ID,
      actorId: STORE_ID,
    });

    expect(reservationRepo.updateStatus).toHaveBeenCalledWith(
      RESERVATION_ID,
      ReservationStatus.READY,
      expect.objectContaining({ event: 'PICKUP_WINDOW_START' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ORDERING_EVENTS.RESERVATION_READY,
      expect.objectContaining({ reservationId: RESERVATION_ID }),
    );
  });
});

// ---------------------------------------------------------------------------
// Step 4: QR/PIN validation (READY -> PICKED_UP)
// ---------------------------------------------------------------------------

describe('Step 4: Consumer validates pickup (READY -> PICKED_UP)', () => {
  let service: ReservationService;
  let reservationRepo: ReturnType<typeof makeReservationRepo>;
  let eventEmitter: ReturnType<typeof makeEventEmitter>;

  const READY_RESERVATION = makeReservation({
    status: ReservationStatus.READY,
    qrCode: 'correct-qr-token',
    pinCode: '123456',
  });

  beforeEach(() => {
    reservationRepo = makeReservationRepo();
    eventEmitter = makeEventEmitter();
    service = new ReservationService(
      reservationRepo as never,
      makeCatalogPort() as never,
      eventEmitter as never,
    );
  });

  it('transitions to PICKED_UP when QR code matches', async () => {
    reservationRepo.findById.mockResolvedValueOnce(READY_RESERVATION);
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.PICKED_UP }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.PICKED_UP, pickedUpAt: new Date() }),
    );

    await service.validatePickup({
      reservationId: RESERVATION_ID,
      actorId: STORE_ID,
      qrCode: 'correct-qr-token',
    });

    expect(reservationRepo.updateStatus).toHaveBeenCalledWith(
      RESERVATION_ID,
      ReservationStatus.PICKED_UP,
      expect.objectContaining({ event: 'QR_VALIDATED' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ORDERING_EVENTS.RESERVATION_PICKED_UP,
      expect.objectContaining({ reservationId: RESERVATION_ID }),
    );
  });

  it('transitions to PICKED_UP when PIN code matches (alternative validation)', async () => {
    reservationRepo.findById.mockResolvedValueOnce(READY_RESERVATION);
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.PICKED_UP }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.PICKED_UP }),
    );

    await service.validatePickup({
      reservationId: RESERVATION_ID,
      actorId: STORE_ID,
      pinCode: '123456',
    });

    expect(reservationRepo.updateStatus).toHaveBeenCalledWith(
      RESERVATION_ID,
      ReservationStatus.PICKED_UP,
      expect.any(Object),
    );
  });

  it('throws InvalidPickupCodeError when QR and PIN are both wrong', async () => {
    reservationRepo.findById.mockResolvedValueOnce(READY_RESERVATION);

    await expect(
      service.validatePickup({
        reservationId: RESERVATION_ID,
        actorId: STORE_ID,
        qrCode: 'wrong-qr-token',
        pinCode: '000000',
      }),
    ).rejects.toThrow(InvalidPickupCodeError);
  });

  it('throws InvalidPickupCodeError when neither QR nor PIN is provided', async () => {
    reservationRepo.findById.mockResolvedValueOnce(READY_RESERVATION);

    await expect(
      service.validatePickup({
        reservationId: RESERVATION_ID,
        actorId: STORE_ID,
        // no qrCode, no pinCode
      }),
    ).rejects.toThrow(InvalidPickupCodeError);
  });
});

// ---------------------------------------------------------------------------
// Step 5: Consumer cancellation guards
// ---------------------------------------------------------------------------

describe('Step 5: Consumer cancellation rules', () => {
  let service: ReservationService;
  let catalogPort: ReturnType<typeof makeCatalogPort>;
  let reservationRepo: ReturnType<typeof makeReservationRepo>;
  let eventEmitter: ReturnType<typeof makeEventEmitter>;

  beforeEach(() => {
    catalogPort = makeCatalogPort();
    reservationRepo = makeReservationRepo();
    eventEmitter = makeEventEmitter();
    service = new ReservationService(
      reservationRepo as never,
      catalogPort as never,
      eventEmitter as never,
    );
  });

  it('consumer can cancel a CONFIRMED reservation before pickup window', async () => {
    const futurePickupStart = new Date(Date.now() + 2 * 60 * 60 * 1000);
    catalogPort.getBasket.mockResolvedValueOnce(
      makeBasketInfo({ pickupStart: futurePickupStart }),
    );
    reservationRepo.findById.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CONFIRMED }),
    );
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CANCELLED_CONSUMER }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CANCELLED_CONSUMER, cancelledAt: new Date() }),
    );

    await service.cancelReservation({
      reservationId: RESERVATION_ID,
      actorId: CONSUMER_ID,
      actorRole: 'consumer',
    });

    expect(catalogPort.incrementStock).toHaveBeenCalledWith(BASKET_ID, 1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ORDERING_EVENTS.RESERVATION_CANCELLED,
      expect.objectContaining({ cancelledBy: 'consumer' }),
    );
  });

  it('throws CancellationWindowExpiredError when consumer tries to cancel after pickup window started', async () => {
    const pastPickupStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    catalogPort.getBasket.mockResolvedValueOnce(
      makeBasketInfo({ pickupStart: pastPickupStart }),
    );
    reservationRepo.findById.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CONFIRMED }),
    );

    await expect(
      service.cancelReservation({
        reservationId: RESERVATION_ID,
        actorId: CONSUMER_ID,
        actorRole: 'consumer',
      }),
    ).rejects.toThrow(CancellationWindowExpiredError);
  });

  it('stock is restored when partner cancels', async () => {
    reservationRepo.findById.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CONFIRMED }),
    );
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CANCELLED_PARTNER }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.CANCELLED_PARTNER, cancelledAt: new Date() }),
    );

    await service.cancelReservation({
      reservationId: RESERVATION_ID,
      actorId: STORE_ID,
      actorRole: 'partner',
    });

    expect(catalogPort.incrementStock).toHaveBeenCalledWith(BASKET_ID, 1);
  });
});

// ---------------------------------------------------------------------------
// Step 6: Hold timeout expiry (PENDING_PAYMENT -> EXPIRED)
// ---------------------------------------------------------------------------

describe('Step 6: Reservation expiry restores stock', () => {
  let service: ReservationService;
  let catalogPort: ReturnType<typeof makeCatalogPort>;
  let reservationRepo: ReturnType<typeof makeReservationRepo>;
  let eventEmitter: ReturnType<typeof makeEventEmitter>;

  beforeEach(() => {
    catalogPort = makeCatalogPort();
    reservationRepo = makeReservationRepo();
    eventEmitter = makeEventEmitter();
    service = new ReservationService(
      reservationRepo as never,
      catalogPort as never,
      eventEmitter as never,
    );
  });

  it('transitions PENDING_PAYMENT to EXPIRED and restores stock', async () => {
    reservationRepo.findById.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.PENDING_PAYMENT }),
    );
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.EXPIRED }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.EXPIRED, expiredAt: new Date() }),
    );

    await service.expireReservation({ reservationId: RESERVATION_ID });

    expect(catalogPort.incrementStock).toHaveBeenCalledWith(BASKET_ID, 1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ORDERING_EVENTS.RESERVATION_EXPIRED,
      expect.objectContaining({ reservationId: RESERVATION_ID }),
    );
  });

  it('does not restore stock if reservation is not found', async () => {
    reservationRepo.findById.mockResolvedValueOnce(null);

    await expect(
      service.expireReservation({ reservationId: 'nonexistent-id' }),
    ).rejects.toThrow(ReservationNotFoundError);

    expect(catalogPort.incrementStock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// No-show scenario
// ---------------------------------------------------------------------------

describe('No-show: consumer does not pick up (READY -> NO_SHOW)', () => {
  it('transitions READY to NO_SHOW and emits no-show event', async () => {
    const catalogPort = makeCatalogPort();
    const reservationRepo = makeReservationRepo();
    const eventEmitter = makeEventEmitter();
    const service = new ReservationService(
      reservationRepo as never,
      catalogPort as never,
      eventEmitter as never,
    );

    reservationRepo.findById.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.READY }),
    );
    reservationRepo.updateStatus.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.NO_SHOW }),
    );
    reservationRepo.update.mockResolvedValueOnce(
      makeReservation({ status: ReservationStatus.NO_SHOW, noShowAt: new Date() }),
    );

    await service.markNoShow({
      reservationId: RESERVATION_ID,
      actorId: 'system',
      actorRole: 'system',
    });

    expect(reservationRepo.updateStatus).toHaveBeenCalledWith(
      RESERVATION_ID,
      ReservationStatus.NO_SHOW,
      expect.objectContaining({ event: 'NO_SHOW_TIMEOUT' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ORDERING_EVENTS.RESERVATION_NO_SHOW,
      expect.objectContaining({ reservationId: RESERVATION_ID }),
    );
  });
});
