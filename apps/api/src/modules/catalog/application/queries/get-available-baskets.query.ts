/**
 * Query to fetch available baskets with filters and pagination.
 */
export interface GetAvailableBasketsQuery {
  categoryId?: string;
  tagIds?: string[];
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  pickupAfter?: Date;
  pickupBefore?: Date;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
