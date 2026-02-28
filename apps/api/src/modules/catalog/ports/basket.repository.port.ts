import type { Basket } from '../domain/entities/basket.entity';
import type { BasketStatus } from '../domain/enums/basket-status.enum';

export interface BasketFilters {
  categoryId?: string;
  tagIds?: string[];
  status?: BasketStatus;
  minPrice?: number;
  maxPrice?: number;
  pickupAfter?: Date;
  pickupBefore?: Date;
  storeId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface BasketPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedBaskets {
  baskets: Basket[];
  total: number;
}

/**
 * Outbound port (driven adapter interface) for basket persistence.
 * The domain layer depends on this interface — not on Prisma directly.
 */
export abstract class BasketRepositoryPort {
  abstract findById(id: string): Promise<Basket | null>;

  abstract findMany(
    filters: BasketFilters,
    pagination: BasketPagination,
  ): Promise<PaginatedBaskets>;

  abstract findByStore(
    storeId: string,
    pagination: BasketPagination,
  ): Promise<PaginatedBaskets>;

  abstract create(basket: Omit<Basket, 'id' | 'createdAt' | 'updatedAt'>): Promise<Basket>;

  abstract update(id: string, data: Partial<Omit<Basket, 'id' | 'storeId' | 'createdAt' | 'updatedAt'>>): Promise<Basket>;

  abstract updateStatus(id: string, status: BasketStatus): Promise<Basket>;

  /**
   * Atomically decrements stock, ensuring it never goes negative.
   * Returns the updated stock after decrement, or null if insufficient stock.
   */
  abstract atomicDecrementStock(id: string, quantity: number): Promise<number | null>;

  /**
   * Increments stock (e.g., on reservation cancellation).
   * Returns the new stock value.
   */
  abstract incrementStock(id: string, quantity: number): Promise<number>;

  abstract delete(id: string): Promise<void>;
}
