import { z } from 'zod';

export const TagSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  namesFr: z.string().min(1),
  namesEn: z.string().nullable().optional(),
  namesKr: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Tag = z.infer<typeof TagSchema>;

export function createTag(input: unknown): Tag {
  return TagSchema.parse(input);
}
