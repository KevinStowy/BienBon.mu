import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SseService } from '../sse.service';
import { SSE_EVENT_TYPES } from '../types/sse-event.types';
import type {
  ReservationCreatedDomainEvent,
  ReservationConfirmedDomainEvent,
  ReservationCancelledDomainEvent,
  ReservationReadyDomainEvent,
  ReservationPickedUpDomainEvent,
  ReservationNoShowDomainEvent,
} from '../types/sse-event.types';

/**
 * Listens to ordering domain events and forwards them as SSE events.
 *
 * Consumer receives: reservation_status updates for their own reservations.
 * Partner receives: reservation_received when a new order arrives,
 *                   reservation_cancelled, pickup_validated (picked_up).
 *
 * ADR-009: In-process EventEmitter2 for Phase 1 (no Redis Pub/Sub yet)
 */
@Injectable()
export class ReservationListener {
  private readonly logger = new Logger(ReservationListener.name);

  constructor(private readonly sseService: SseService) {}

  // ---------------------------------------------------------------------------
  // ordering.reservation.created
  // ---------------------------------------------------------------------------

  @OnEvent('ordering.reservation.created')
  handleReservationCreated(event: ReservationCreatedDomainEvent): void {
    this.logger.debug(
      `Handling ordering.reservation.created: reservationId=${event.reservationId}`,
    );

    // Notify consumer: their reservation was created
    this.sseService.emitToUser(
      event.consumerId,
      SSE_EVENT_TYPES.RESERVATION_STATUS,
      {
        reservationId: event.reservationId,
        status: 'created',
        basketId: event.basketId,
      },
    );

    // Notify partner: a new reservation has been received for their store
    this.sseService.emitToUser(
      event.storeId,
      SSE_EVENT_TYPES.RESERVATION_RECEIVED,
      {
        reservationId: event.reservationId,
        basketId: event.basketId,
        consumerId: event.consumerId,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // ordering.reservation.confirmed
  // ---------------------------------------------------------------------------

  @OnEvent('ordering.reservation.confirmed')
  handleReservationConfirmed(event: ReservationConfirmedDomainEvent): void {
    this.logger.debug(
      `Handling ordering.reservation.confirmed: reservationId=${event.reservationId}`,
    );

    // Notify consumer: their reservation is confirmed
    this.sseService.emitToUser(
      event.consumerId,
      SSE_EVENT_TYPES.RESERVATION_STATUS,
      {
        reservationId: event.reservationId,
        status: 'confirmed',
      },
    );
  }

  // ---------------------------------------------------------------------------
  // ordering.reservation.cancelled
  // ---------------------------------------------------------------------------

  @OnEvent('ordering.reservation.cancelled')
  handleReservationCancelled(event: ReservationCancelledDomainEvent): void {
    this.logger.debug(
      `Handling ordering.reservation.cancelled: reservationId=${event.reservationId}`,
    );

    // Notify consumer: their reservation was cancelled
    this.sseService.emitToUser(
      event.consumerId,
      SSE_EVENT_TYPES.RESERVATION_STATUS,
      {
        reservationId: event.reservationId,
        status: 'cancelled',
        reason: event.reason,
      },
    );

    // Notify partner: a reservation for their store was cancelled
    this.sseService.emitToUser(
      event.storeId,
      SSE_EVENT_TYPES.RESERVATION_CANCELLED,
      {
        reservationId: event.reservationId,
        reason: event.reason,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // ordering.reservation.ready
  // ---------------------------------------------------------------------------

  @OnEvent('ordering.reservation.ready')
  handleReservationReady(event: ReservationReadyDomainEvent): void {
    this.logger.debug(
      `Handling ordering.reservation.ready: reservationId=${event.reservationId}`,
    );

    // Notify consumer: their order is ready for pickup
    this.sseService.emitToUser(
      event.consumerId,
      SSE_EVENT_TYPES.RESERVATION_STATUS,
      {
        reservationId: event.reservationId,
        status: 'ready',
      },
    );
  }

  // ---------------------------------------------------------------------------
  // ordering.reservation.picked_up
  // ---------------------------------------------------------------------------

  @OnEvent('ordering.reservation.picked_up')
  handleReservationPickedUp(event: ReservationPickedUpDomainEvent): void {
    this.logger.debug(
      `Handling ordering.reservation.picked_up: reservationId=${event.reservationId}`,
    );

    // Notify consumer: pickup confirmed
    this.sseService.emitToUser(
      event.consumerId,
      SSE_EVENT_TYPES.RESERVATION_STATUS,
      {
        reservationId: event.reservationId,
        status: 'picked_up',
      },
    );

    // Notify partner: pickup validated
    this.sseService.emitToUser(
      event.storeId,
      SSE_EVENT_TYPES.PICKUP_VALIDATED,
      {
        reservationId: event.reservationId,
        consumerId: event.consumerId,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // ordering.reservation.no_show
  // ---------------------------------------------------------------------------

  @OnEvent('ordering.reservation.no_show')
  handleReservationNoShow(event: ReservationNoShowDomainEvent): void {
    this.logger.debug(
      `Handling ordering.reservation.no_show: reservationId=${event.reservationId}`,
    );

    // Notify consumer: no-show recorded
    this.sseService.emitToUser(
      event.consumerId,
      SSE_EVENT_TYPES.RESERVATION_STATUS,
      {
        reservationId: event.reservationId,
        status: 'no_show',
      },
    );
  }
}
