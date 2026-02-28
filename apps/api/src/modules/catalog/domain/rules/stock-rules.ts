import { InsufficientStockError, InvalidBasketPriceError } from '../errors/catalog-errors';

/**
 * Validates that the selling price is at most 50% of the original price.
 *
 * ADR-003: Basket constraint — selling_price <= original_price * 0.50
 *
 * Throws InvalidBasketPriceError if the price rule is violated.
 */
export function assertValidPrice(originalPrice: number, sellingPrice: number): void {
  const maxSellingPrice = originalPrice * 0.5;
  if (sellingPrice > maxSellingPrice) {
    throw new InvalidBasketPriceError(sellingPrice, originalPrice);
  }
}

/**
 * Validates that decreasing stock by `quantity` will not result in negative stock.
 *
 * Note: For the actual atomic decrement, use the Prisma raw query in the repository.
 * This function is for domain-layer validation before the DB call.
 *
 * Throws InsufficientStockError if stock would go negative.
 */
export function assertSufficientStock(currentStock: number, quantity: number): void {
  if (quantity <= 0) {
    throw new Error('Quantity to decrement must be positive');
  }
  if (currentStock < quantity) {
    throw new InsufficientStockError(currentStock, quantity);
  }
}

/**
 * Calculates the new stock after decrement.
 * Assumes assertSufficientStock has already been called.
 */
export function decrementStock(currentStock: number, quantity: number): number {
  return currentStock - quantity;
}

/**
 * Calculates the new stock after increment (e.g., on cancellation).
 * Stock can only go up to the original quantity — this is enforced at the service layer.
 */
export function incrementStock(currentStock: number, quantity: number): number {
  if (quantity <= 0) {
    throw new Error('Quantity to increment must be positive');
  }
  return currentStock + quantity;
}
