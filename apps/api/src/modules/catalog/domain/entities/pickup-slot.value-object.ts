import { z } from 'zod';
import { ValidationError } from '../../../../shared/errors/domain-error';

/**
 * PickupSlot value object representing a pickup time window.
 *
 * Invariants:
 * - pickupEnd must be after pickupStart
 * - pickupStart must be in the future when creating a new basket
 */
export const PickupSlotSchema = z.object({
  pickupStart: z.date(),
  pickupEnd: z.date(),
});

export type PickupSlot = z.infer<typeof PickupSlotSchema>;

/**
 * Creates and validates a PickupSlot value object.
 * Throws ValidationError if the slot is invalid.
 */
export function createPickupSlot(start: Date, end: Date): PickupSlot {
  if (end <= start) {
    throw new ValidationError(
      'INVALID_PICKUP_WINDOW',
      'Pickup end time must be after pickup start time',
    );
  }
  return { pickupStart: start, pickupEnd: end };
}

/**
 * Checks whether the current time is within the pickup window.
 */
export function isWithinPickupWindow(slot: PickupSlot, now: Date = new Date()): boolean {
  return now >= slot.pickupStart && now <= slot.pickupEnd;
}

/**
 * Checks whether the pickup window has ended.
 */
export function isPickupWindowEnded(slot: PickupSlot, now: Date = new Date()): boolean {
  return now > slot.pickupEnd;
}
