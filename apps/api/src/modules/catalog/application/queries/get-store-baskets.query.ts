/**
 * Query to fetch all baskets belonging to a specific store.
 */
export interface GetStoreBasketsQuery {
  storeId: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
