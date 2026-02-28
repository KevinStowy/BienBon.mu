// =============================================================================
// Store Domain Rules — pure functions, no side effects
// =============================================================================

import { StoreStatus } from '@bienbon/shared-types';
import type { Store } from './store.entity';

// Fields that require admin approval when changed
export const FIELDS_REQUIRING_APPROVAL = [
  'name',
  'description',
  'type',
  'address',
  'city',
  'postalCode',
  'latitude',
  'longitude',
  'phone',
  'foodLicence',
] as const;

export type ApprovalRequiredField = (typeof FIELDS_REQUIRING_APPROVAL)[number];

// Fields that can never be changed after creation
export const IMMUTABLE_FIELDS = ['brn', 'id', 'partnerId', 'createdAt'] as const;
export type ImmutableField = (typeof IMMUTABLE_FIELDS)[number];

/**
 * Returns true if the store is currently active.
 */
export function isStoreActive(store: Store): boolean {
  return store.status === StoreStatus.ACTIVE;
}

/**
 * Returns true if the store is suspended.
 */
export function isStoreSuspended(store: Store): boolean {
  return store.status === StoreStatus.SUSPENDED;
}

/**
 * Returns which fields from the given update require admin approval.
 */
export function getFieldsRequiringApproval(
  update: Record<string, unknown>,
): ApprovalRequiredField[] {
  return FIELDS_REQUIRING_APPROVAL.filter((field) => field in update);
}

/**
 * Returns true if the update contains any field that requires approval.
 */
export function requiresApproval(update: Record<string, unknown>): boolean {
  return getFieldsRequiringApproval(update).length > 0;
}

/**
 * Returns true if the update attempts to modify any immutable field.
 */
export function hasImmutableFieldChange(update: Record<string, unknown>): boolean {
  return IMMUTABLE_FIELDS.some((field) => field in update);
}

/**
 * Validate store photos — max 10, each must be a valid URL.
 */
export function validatePhotos(photoUrls: string[]): { valid: boolean; error?: string } {
  if (photoUrls.length > 10) {
    return { valid: false, error: 'A store cannot have more than 10 photos' };
  }

  for (const url of photoUrls) {
    try {
      new URL(url);
    } catch {
      return { valid: false, error: `Invalid photo URL: ${url}` };
    }
  }

  return { valid: true };
}

/**
 * Validate store hours — all 7 days must be provided (0=Sunday through 6=Saturday).
 * Times must be in HH:MM format.
 */
export function validateHours(
  hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>,
): { valid: boolean; error?: string } {
  const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;

  for (const hour of hours) {
    if (hour.dayOfWeek < 0 || hour.dayOfWeek > 6) {
      return { valid: false, error: `Invalid day of week: ${hour.dayOfWeek}` };
    }

    if (!hour.isClosed) {
      if (!timeRegex.test(hour.openTime)) {
        return { valid: false, error: `Invalid open time format for day ${hour.dayOfWeek}: ${hour.openTime}` };
      }

      if (!timeRegex.test(hour.closeTime)) {
        return { valid: false, error: `Invalid close time format for day ${hour.dayOfWeek}: ${hour.closeTime}` };
      }

      if (hour.openTime >= hour.closeTime) {
        return {
          valid: false,
          error: `Open time must be before close time for day ${hour.dayOfWeek}`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Build field_changes JSON for a modification request.
 * Format: { fieldName: { old: currentValue, new: newValue } }
 */
export function buildFieldChanges(
  current: Partial<Store>,
  updates: Record<string, unknown>,
  approvalFields: ApprovalRequiredField[],
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const field of approvalFields) {
    changes[field] = {
      old: current[field as keyof typeof current] ?? null,
      new: updates[field] ?? null,
    };
  }

  return changes;
}
