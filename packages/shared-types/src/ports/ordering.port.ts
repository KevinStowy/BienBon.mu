// =============================================================================
// IOrderingService — Port for Ordering bounded context (BC-5)
// =============================================================================
// Used by: Admin (reservation management), Consumer (my reservations)
// Communication type: synchronous call
// See: ADR-024 section 3.2 (BC-5) and ADR-017 (state machines)
// =============================================================================

import type {
  CancellationReason,
} from '../enums/index.js';
import type {
  CreateReservationParams,
  PaginatedResponse,
  PaginationDto,
  PickupValidationResult,
  ReservationDto,
  ReservationSummaryDto,
} from '../dto/index.js';

export interface IOrderingService {
  /**
   * Create a new reservation.
   * Orchestrates: stock decrement -> payment pre-auth -> confirmation.
   * If any step fails, compensating actions are executed (stock restore, payment reversal).
   */
  createReservation(params: CreateReservationParams): Promise<ReservationDto>;

  /**
   * Cancel a reservation.
   * Allowed only before the pickup window starts.
   * Triggers: stock restore + payment reversal/refund.
   */
  cancelReservation(reservationId: string, reason: CancellationReason): Promise<void>;

  /**
   * Get a single reservation by ID with full details.
   * Returns null if the reservation does not exist.
   */
  getReservation(reservationId: string): Promise<ReservationDto | null>;

  /**
   * Get reservations for a consumer (paginated, newest first).
   */
  getReservationsByConsumer(
    consumerId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<ReservationSummaryDto>>;

  /**
   * Get reservations for a store (paginated, for partner dashboard).
   */
  getReservationsByStore(
    storeId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<ReservationSummaryDto>>;

  /**
   * Validate pickup using QR code or PIN.
   * Transitions the reservation from READY to PICKED_UP.
   * Triggers: payment capture.
   */
  validatePickup(reservationId: string, code: string): Promise<PickupValidationResult>;
}

/** Injection token for IOrderingService */
export const ORDERING_SERVICE = Symbol('IOrderingService');
