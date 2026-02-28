/**
 * Command to create a new basket in DRAFT status.
 */
export interface CreateBasketCommand {
  storeId: string;
  title: string;
  description?: string;
  originalPrice: number;
  sellingPrice: number;
  quantity: number;
  categoryId: string;
  photoUrl?: string;
  pickupStart: Date;
  pickupEnd: Date;
  tagIds?: string[];
  templateId?: string;
}
