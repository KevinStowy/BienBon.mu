// =============================================================================
// ICatalogService — Port for Catalog bounded context (BC-4)
// =============================================================================
// Used by: Ordering (stock decrement/increment, basket availability)
// Communication type: synchronous call (critical path)
// See: ADR-024 section 3.2 (BC-4) and section 4.2 (context map)
// =============================================================================

import type {
  AvailableBasketsFilter,
  BasketDto,
  BasketSummaryDto,
  PaginatedResponse,
  PaginationDto,
  StockOperationResult,
} from '../dto/index.js';

export interface ICatalogService {
  /**
   * Get a single basket by ID with full details.
   * Returns null if the basket does not exist.
   */
  getBasket(basketId: string): Promise<BasketDto | null>;

  /**
   * Get available baskets with filtering and pagination.
   * "Available" = status PUBLISHED and stock > 0.
   */
  getAvailableBaskets(
    filters: AvailableBasketsFilter,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<BasketSummaryDto>>;

  /**
   * Atomically decrement basket stock (ADR-008).
   * Used by Ordering during reservation creation.
   * Returns success=false if insufficient stock.
   */
  decrementStock(basketId: string, quantity: number): Promise<StockOperationResult>;

  /**
   * Restore stock after cancellation or payment failure.
   * Used by Ordering when a reservation is cancelled or expired.
   */
  incrementStock(basketId: string, quantity: number): Promise<void>;

  /**
   * Check if a basket is available for reservation.
   * A basket is available if status=PUBLISHED and stock > 0.
   */
  isBasketAvailable(basketId: string): Promise<boolean>;
}

/** Injection token for ICatalogService */
export const CATALOG_SERVICE = Symbol('ICatalogService');
