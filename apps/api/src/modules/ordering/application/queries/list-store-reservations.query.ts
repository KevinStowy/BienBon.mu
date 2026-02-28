import type { ReservationStatus } from '../../domain/enums/reservation-status.enum';

/**
 * Query to list reservations for a specific store (partner dashboard).
 */
export interface ListStoreReservationsQuery {
  /** UUID of the store */
  storeId: string;
  /** Optional status filter */
  status?: ReservationStatus;
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}
