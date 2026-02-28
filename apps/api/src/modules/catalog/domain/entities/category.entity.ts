import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  namesFr: z.string().min(1),
  namesEn: z.string().nullable().optional(),
  namesKr: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

export function createCategory(input: unknown): Category {
  return CategorySchema.parse(input);
}
