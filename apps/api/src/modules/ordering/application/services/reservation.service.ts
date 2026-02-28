import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { ReservationRepositoryPort } from '../../ports/reservation.repository.port';
import { CatalogPort } from '../../ports/catalog.port';
import type { Reservation } from '../../domain/entities/reservation.entity';
import { ReservationStatus } from '../../domain/enums/reservation-status.enum';
import {
  ReservationNotFoundError,
  DuplicateReservationError,
  InvalidPickupCodeError,
  CancellationWindowExpiredError,
} from '../../domain/errors/ordering-errors';
import {
  transition,
  ReservationEvent,
} from '../../domain/rules/reservation-state-machine';
import {
  generateQrCode,
  generatePin,
  computeExpiresAt,
  isPickupCodeValid,
} from '../../domain/rules/reservation-rules';
import {
  ORDERING_EVENTS,
  type ReservationCreatedEvent,
  type ReservationConfirmedEvent,
  type ReservationCancelledEvent,
  type ReservationReadyEvent,
  type ReservationPickedUpEvent,
  type ReservationNoShowEvent,
  type ReservationExpiredEvent,
} from '../../domain/events/ordering-events';
import type { CreateReservationCommand } from '../commands/create-reservation.command';
import type { ConfirmReservationCommand } from '../commands/confirm-reservation.command';
import type { CancelReservationCommand } from '../commands/cancel-reservation.command';
import type { MarkReadyCommand } from '../commands/mark-ready.command';
import type { ValidatePickupCommand } from '../commands/validate-pickup.command';
import type { MarkNoShowCommand } from '../commands/mark-no-show.command';
import type { ExpireReservationCommand } from '../commands/expire-reservation.command';
import type { GetReservationQuery } from '../queries/get-reservation.query';
import type { ListConsumerReservationsQuery } from '../queries/list-consumer-reservations.query';
import type { ListStoreReservationsQuery } from '../queries/list-store-reservations.query';
import type { PaginatedReservations } from '../../ports/reservation.repository.port';
import { BusinessRuleError } from '../../../../shared/errors/domain-error';
import { BasketInfo } from '../../ports/catalog.port';

/**
 * Reservation application service — orchestrates commands and queries.
 *
 * Follows the hexagonal architecture pattern (ADR-024):
 * - Delegates domain logic to pure functions (state machine, rules)
 * - Delegates persistence to ReservationRepositoryPort
 * - Delegates stock ops to CatalogPort
 * - Delegates payment ops to PaymentPort
 * - Emits domain events via EventEmitter2
 */
@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly reservationRepo: ReservationRepositoryPort,
    private readonly catalogPort: CatalogPort,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * Creates a new reservation for a consumer.
   *
   * Steps:
   * 1. Load basket info from catalog
   * 2. Check duplicate reservation guard
   * 3. Atomically decrement stock
   * 4. Create reservation in PENDING_PAYMENT status
   * 5. Emit RESERVATION_CREATED event
   */
  async createReservation(cmd: CreateReservationCommand): Promise<Reservation> {
    // 1. Load basket info
    const basket = await this.catalogPort.getBasket(cmd.basketId);
    if (!basket) {
      throw new BusinessRuleError(
        'BASKET_NOT_FOUND',
        `Basket '${cmd.basketId}' not found`,
      );
    }

    this.assertBasketAvailable(basket);

    // 2. Duplicate reservation guard
    const existing = await this.reservationRepo.findActiveByConsumerAndBasket(
      cmd.consumerId,
      cmd.basketId,
    );
    if (existing) {
      throw new DuplicateReservationError(cmd.consumerId, cmd.basketId);
    }

    // 3. Atomically decrement stock
    const remainingStock = await this.catalogPort.decrementStock(
      cmd.basketId,
      cmd.quantity,
    );
    if (remainingStock === null) {
      throw new BusinessRuleError(
        'INSUFFICIENT_STOCK',
        `Not enough stock for basket '${cmd.basketId}'`,
      );
    }

    // 4. Create reservation
    const now = new Date();
    const unitPrice = basket.sellingPrice;
    const totalPrice = unitPrice * cmd.quantity;
    const expiresAt = computeExpiresAt(now);

    const reservation = await this.reservationRepo.create({
      id: randomUUID(),
      basketId: cmd.basketId,
      consumerId: cmd.consumerId,
      quantity: cmd.quantity,
      unitPrice,
      totalPrice,
      status: ReservationStatus.PENDING_PAYMENT,
      qrCode: generateQrCode(),
      pinCode: generatePin(),
      expiresAt,
      confirmedAt: null,
      readyAt: null,
      pickedUpAt: null,
      cancelledAt: null,
      noShowAt: null,
      expiredAt: null,
    });

    // 5. Emit domain event
    const event: ReservationCreatedEvent = {
      reservationId: reservation.id,
      basketId: reservation.basketId,
      consumerId: reservation.consumerId,
      quantity: reservation.quantity,
      totalPrice: reservation.totalPrice,
      expiresAt: reservation.expiresAt ?? null,
    };
    this.eventEmitter.emit(ORDERING_EVENTS.RESERVATION_CREATED, event);

    this.logger.log(
      `Reservation created: ${reservation.id} for consumer ${cmd.consumerId}`,
    );
    return reservation;
  }

  /**
   * Confirms a reservation after successful payment.
   * Transitions: PENDING_PAYMENT → CONFIRMED
   */
  async confirmReservation(cmd: ConfirmReservationCommand): Promise<Reservation> {
    const reservation = await this.requireReservation(cmd.reservationId);

    const newStatus = transition(
      reservation.status,
      ReservationEvent.PAYMENT_SUCCESS,
    );

    const now = new Date();
    const updated = await this.reservationRepo.updateStatus(
      reservation.id,
      newStatus,
      {
        fromStatus: reservation.status,
        toStatus: newStatus,
        event: ReservationEvent.PAYMENT_SUCCESS,
        actorId: cmd.actorId,
        actorRole: cmd.actorRole,
      },
    );

    // Update confirmedAt timestamp
    const withTimestamp = await this.reservationRepo.update(updated.id, {
      confirmedAt: now,
    });

    const domainEvent: ReservationConfirmedEvent = {
      reservationId: withTimestamp.id,
      basketId: withTimestamp.basketId,
      consumerId: withTimestamp.consumerId,
      totalPrice: withTimestamp.totalPrice,
      confirmedAt: now,
    };
    this.eventEmitter.emit(ORDERING_EVENTS.RESERVATION_CONFIRMED, domainEvent);

    this.logger.log(`Reservation confirmed: ${reservation.id}`);
    return withTimestamp;
  }

  /**
   * Cancels a reservation.
   * Consumers can cancel only before the pickup window starts.
   * Partners can cancel at any time (CONFIRMED or READY).
   * Stock is re-incremented on cancellation.
   */
  async cancelReservation(cmd: CancelReservationCommand): Promise<Reservation> {
    const reservation = await this.requireReservation(cmd.reservationId);

    let event: typeof ReservationEvent[keyof typeof ReservationEvent];

    if (cmd.actorRole === 'consumer') {
      // Consumer can only cancel CONFIRMED reservations before pickup window
      const basket = await this.catalogPort.getBasket(reservation.basketId);
      if (basket) {
        const now = new Date();
        if (now >= basket.pickupStart) {
          throw new CancellationWindowExpiredError(reservation.id);
        }
      }
      event = ReservationEvent.CONSUMER_CANCEL;
    } else {
      // Partner/admin can cancel
      event = ReservationEvent.PARTNER_CANCEL;
    }

    const newStatus = transition(reservation.status, event);
    const now = new Date();

    const updated = await this.reservationRepo.updateStatus(
      reservation.id,
      newStatus,
      {
        fromStatus: reservation.status,
        toStatus: newStatus,
        event,
        actorId: cmd.actorId,
        actorRole: cmd.actorRole,
        metadata: cmd.reason ? { reason: cmd.reason } : undefined,
      },
    );

    await this.reservationRepo.update(updated.id, { cancelledAt: now });

    // Restore stock
    await this.catalogPort.incrementStock(
      reservation.basketId,
      reservation.quantity,
    );

    const cancelledBy =
      cmd.actorRole === 'consumer' ? 'consumer' : 'partner';

    const domainEvent: ReservationCancelledEvent = {
      reservationId: reservation.id,
      basketId: reservation.basketId,
      consumerId: reservation.consumerId,
      quantity: reservation.quantity,
      cancelledBy,
      reason: cmd.reason,
      cancelledAt: now,
    };
    this.eventEmitter.emit(ORDERING_EVENTS.RESERVATION_CANCELLED, domainEvent);

    this.logger.log(
      `Reservation cancelled: ${reservation.id} by ${cmd.actorRole}`,
    );
    return updated;
  }

  /**
   * Marks a reservation as ready for pickup.
   * Transitions: CONFIRMED → READY
   */
  async markReady(cmd: MarkReadyCommand): Promise<Reservation> {
    const reservation = await this.requireReservation(cmd.reservationId);

    const newStatus = transition(
      reservation.status,
      ReservationEvent.PICKUP_WINDOW_START,
    );

    const now = new Date();
    const updated = await this.reservationRepo.updateStatus(
      reservation.id,
      newStatus,
      {
        fromStatus: reservation.status,
        toStatus: newStatus,
        event: ReservationEvent.PICKUP_WINDOW_START,
        actorId: cmd.actorId,
        actorRole: 'partner',
      },
    );

    await this.reservationRepo.update(updated.id, { readyAt: now });

    const domainEvent: ReservationReadyEvent = {
      reservationId: reservation.id,
      basketId: reservation.basketId,
      consumerId: reservation.consumerId,
      readyAt: now,
    };
    this.eventEmitter.emit(ORDERING_EVENTS.RESERVATION_READY, domainEvent);

    this.logger.log(`Reservation marked ready: ${reservation.id}`);
    return updated;
  }

  /**
   * Validates pickup via QR code or PIN code.
   * Transitions: READY → PICKED_UP
   */
  async validatePickup(cmd: ValidatePickupCommand): Promise<Reservation> {
    const reservation = await this.requireReservation(cmd.reservationId);

    // Validate QR or PIN code
    if (!isPickupCodeValid(reservation, cmd.qrCode, cmd.pinCode)) {
      throw new InvalidPickupCodeError();
    }

    const newStatus = transition(
      reservation.status,
      ReservationEvent.QR_VALIDATED,
    );

    const now = new Date();
    const updated = await this.reservationRepo.updateStatus(
      reservation.id,
      newStatus,
      {
        fromStatus: reservation.status,
        toStatus: newStatus,
        event: ReservationEvent.QR_VALIDATED,
        actorId: cmd.actorId,
        actorRole: 'partner',
      },
    );

    await this.reservationRepo.update(updated.id, { pickedUpAt: now });

    const domainEvent: ReservationPickedUpEvent = {
      reservationId: reservation.id,
      basketId: reservation.basketId,
      consumerId: reservation.consumerId,
      pickedUpAt: now,
    };
    this.eventEmitter.emit(ORDERING_EVENTS.RESERVATION_PICKED_UP, domainEvent);

    this.logger.log(`Reservation picked up: ${reservation.id}`);
    return updated;
  }

  /**
   * Marks a reservation as no-show.
   * Transitions: READY → NO_SHOW
   */
  async markNoShow(cmd: MarkNoShowCommand): Promise<Reservation> {
    const reservation = await this.requireReservation(cmd.reservationId);

    const newStatus = transition(
      reservation.status,
      ReservationEvent.NO_SHOW_TIMEOUT,
    );

    const now = new Date();
    const updated = await this.reservationRepo.updateStatus(
      reservation.id,
      newStatus,
      {
        fromStatus: reservation.status,
        toStatus: newStatus,
        event: ReservationEvent.NO_SHOW_TIMEOUT,
        actorId: cmd.actorId,
        actorRole: cmd.actorRole,
      },
    );

    await this.reservationRepo.update(updated.id, { noShowAt: now });

    const domainEvent: ReservationNoShowEvent = {
      reservationId: reservation.id,
      basketId: reservation.basketId,
      consumerId: reservation.consumerId,
      noShowAt: now,
    };
    this.eventEmitter.emit(ORDERING_EVENTS.RESERVATION_NO_SHOW, domainEvent);

    this.logger.log(`Reservation no-show: ${reservation.id}`);
    return updated;
  }

  /**
   * Expires a reservation that was not paid in time.
   * Transitions: PENDING_PAYMENT → EXPIRED
   * Stock is re-incremented.
   */
  async expireReservation(cmd: ExpireReservationCommand): Promise<Reservation> {
    const reservation = await this.requireReservation(cmd.reservationId);

    const newStatus = transition(
      reservation.status,
      ReservationEvent.HOLD_TIMEOUT,
    );

    const now = new Date();
    const updated = await this.reservationRepo.updateStatus(
      reservation.id,
      newStatus,
      {
        fromStatus: reservation.status,
        toStatus: newStatus,
        event: ReservationEvent.HOLD_TIMEOUT,
        actorRole: 'system',
      },
    );

    await this.reservationRepo.update(updated.id, { expiredAt: now });

    // Restore stock
    await this.catalogPort.incrementStock(
      reservation.basketId,
      reservation.quantity,
    );

    const domainEvent: ReservationExpiredEvent = {
      reservationId: reservation.id,
      basketId: reservation.basketId,
      consumerId: reservation.consumerId,
      quantity: reservation.quantity,
      expiredAt: now,
    };
    this.eventEmitter.emit(ORDERING_EVENTS.RESERVATION_EXPIRED, domainEvent);

    this.logger.log(`Reservation expired: ${reservation.id}`);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getReservation(query: GetReservationQuery): Promise<Reservation> {
    return this.requireReservation(query.reservationId);
  }

  async listConsumerReservations(
    query: ListConsumerReservationsQuery,
  ): Promise<PaginatedReservations> {
    return this.reservationRepo.findMany(
      {
        consumerId: query.consumerId,
        status: query.status,
      },
      {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );
  }

  async listStoreReservations(
    query: ListStoreReservationsQuery,
  ): Promise<PaginatedReservations> {
    return this.reservationRepo.findMany(
      {
        storeId: query.storeId,
        status: query.status,
      },
      {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async requireReservation(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepo.findById(id);
    if (!reservation) {
      throw new ReservationNotFoundError(id);
    }
    return reservation;
  }

  private assertBasketAvailable(basket: BasketInfo): void {
    const availableStatuses = ['PUBLISHED', 'PICKUP_WINDOW'];
    if (!availableStatuses.includes(basket.status)) {
      throw new BusinessRuleError(
        'BASKET_NOT_AVAILABLE',
        `Basket '${basket.id}' is not available for reservation (status: ${basket.status})`,
      );
    }
  }
}
