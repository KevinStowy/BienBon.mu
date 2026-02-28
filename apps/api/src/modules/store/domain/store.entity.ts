// =============================================================================
// Store Entity — domain type (maps to Store Prisma model)
// =============================================================================

import { z } from 'zod';
import { StoreStatus, StoreType } from '@bienbon/shared-types';

export const StoreHourSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string(),
  closeTime: z.string(),
  isClosed: z.boolean(),
});

export const StorePhotoSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  url: z.string().url(),
  position: z.number().int().nonnegative(),
  createdAt: z.date(),
});

export const StoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.nativeEnum(StoreType),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  postalCode: z.string().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  brn: z.string().nullable(),
  foodLicence: z.string().nullable(),
  avgRating: z.number().min(0).max(5),
  totalReviews: z.number().int().nonnegative(),
  status: z.nativeEnum(StoreStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Store = z.infer<typeof StoreSchema>;
export type StoreHour = z.infer<typeof StoreHourSchema>;
export type StorePhoto = z.infer<typeof StorePhotoSchema>;

export function createStore(input: unknown): Store {
  return StoreSchema.parse(input);
}
