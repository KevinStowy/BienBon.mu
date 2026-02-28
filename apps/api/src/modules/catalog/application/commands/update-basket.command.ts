/**
 * Command to update a DRAFT basket.
 * Only DRAFT baskets can be edited.
 */
export interface UpdateBasketCommand {
  basketId: string;
  title?: string;
  description?: string;
  originalPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  categoryId?: string;
  photoUrl?: string;
  pickupStart?: Date;
  pickupEnd?: Date;
  tagIds?: string[];
}
