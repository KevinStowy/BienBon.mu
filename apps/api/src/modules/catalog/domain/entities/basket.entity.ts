import { z } from 'zod';
import { BasketStatus } from '../enums/basket-status.enum';

/**
 * Zod schema for the Basket aggregate root.
 * Enforces domain invariants at the data level.
 */
export const BasketSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(60),
  description: z.string().nullable().optional(),
  originalPrice: z.number().positive(),
  sellingPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().uuid(),
  photoUrl: z.string().url().nullable().optional(),
  pickupStart: z.date(),
  pickupEnd: z.date(),
  status: z.enum([
    BasketStatus.DRAFT,
    BasketStatus.PUBLISHED,
    BasketStatus.SOLD_OUT,
    BasketStatus.PICKUP_WINDOW,
    BasketStatus.ENDED,
    BasketStatus.CANCELLED,
    BasketStatus.ARCHIVED,
  ]),
  tagIds: z.array(z.string().uuid()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Basket = z.infer<typeof BasketSchema>;

/**
 * Factory function that validates and creates a Basket domain entity.
 * Throws ZodError if validation fails.
 */
export function createBasket(input: unknown): Basket {
  return BasketSchema.parse(input);
}
