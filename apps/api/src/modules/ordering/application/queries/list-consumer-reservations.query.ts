import type { ReservationStatus } from '../../domain/enums/reservation-status.enum';

/**
 * Query to list a consumer's own reservations.
 */
export interface ListConsumerReservationsQuery {
  /** UUID of the consumer */
  consumerId: string;
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
