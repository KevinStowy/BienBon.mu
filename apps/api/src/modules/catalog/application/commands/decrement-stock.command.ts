/**
 * Command to atomically decrement basket stock.
 * Used by the Ordering BC when a reservation is confirmed.
 */
export interface DecrementStockCommand {
  basketId: string;
  quantity: number;
}
