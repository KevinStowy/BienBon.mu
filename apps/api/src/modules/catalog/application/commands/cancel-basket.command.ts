/**
 * Command to cancel a PUBLISHED basket.
 */
export interface CancelBasketCommand {
  basketId: string;
  reason?: string;
}
