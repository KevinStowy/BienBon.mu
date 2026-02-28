import type { Reservation } from '../domain/entities/reservation.entity';
import type { ReservationStatus } from '../domain/enums/reservation-status.enum';

export interface ReservationFilters {
  consumerId?: string;
  storeId?: string;
  basketId?: string;
  status?: ReservationStatus;
}

export interface ReservationPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedReservations {
  reservations: Reservation[];
  total: number;
}

export interface StatusHistoryEntry {
  fromStatus: string;
  toStatus: string;
  event: string;
  actorId?: string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Outbound port (driven adapter interface) for reservation persistence.
 * The domain layer depends on this interface — not on Prisma directly.
 *
 * ADR-024: Hexagonal architecture — domain drives persistence via ports.
 */
export abstract class ReservationRepositoryPort {
  /** Find a single reservation by its UUID. Returns null if not found. */
  abstract findById(id: string): Promise<Reservation | null>;

  /** Find paginated reservations matching filters. */
  abstract findMany(
    filters: ReservationFilters,
    pagination: ReservationPagination,
  ): Promise<PaginatedReservations>;

  /**
   * Find an active reservation (PENDING_PAYMENT or CONFIRMED) for a specific
   * consumer+basket pair. Used to enforce the duplicate reservation guard.
   */
  abstract findActiveByConsumerAndBasket(
    consumerId: string,
    basketId: string,
  ): Promise<Reservation | null>;

  /** Persist a new reservation. */
  abstract create(
    data: Omit<Reservation, 'createdAt' | 'updatedAt'>,
  ): Promise<Reservation>;

  /** Update mutable fields of an existing reservation. */
  abstract update(
    id: string,
    data: Partial<
      Omit<Reservation, 'id' | 'basketId' | 'consumerId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<Reservation>;

  /** Transition status and record the history entry atomically. */
  abstract updateStatus(
    id: string,
    status: ReservationStatus,
    historyEntry: StatusHistoryEntry,
  ): Promise<Reservation>;
}
