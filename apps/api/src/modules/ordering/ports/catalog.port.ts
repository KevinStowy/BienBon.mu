/**
 * Minimal basket info needed by the Ordering BC.
 * Keeps the coupling surface small — only what ordering needs.
 */
export interface BasketInfo {
  id: string;
  storeId: string;
  sellingPrice: number;
  stock: number;
  pickupStart: Date;
  pickupEnd: Date;
  status: string;
}

/**
 * Outbound port for catalog operations needed by the Ordering BC.
 * Decouples ordering from the Catalog implementation.
 *
 * ADR-024: Inter-BC communication via ports/adapters, not direct imports.
 * ADR-008: Stock operations are atomic.
 */
export abstract class CatalogPort {
  /**
   * Retrieves basket info needed to create a reservation.
   * Returns null if the basket does not exist.
   *
   * @param basketId - UUID of the basket
   */
  abstract getBasket(basketId: string): Promise<BasketInfo | null>;

  /**
   * Atomically decrements the basket stock by the given quantity.
   * Returns the remaining stock after decrement.
   * Returns null if insufficient stock.
   *
   * @param basketId - UUID of the basket
   * @param quantity - Number of units to reserve
   */
  abstract decrementStock(
    basketId: string,
    quantity: number,
  ): Promise<number | null>;

  /**
   * Increments basket stock (e.g., on reservation cancellation or expiry).
   *
   * @param basketId - UUID of the basket
   * @param quantity - Number of units to restore
   */
  abstract incrementStock(basketId: string, quantity: number): Promise<void>;
}
