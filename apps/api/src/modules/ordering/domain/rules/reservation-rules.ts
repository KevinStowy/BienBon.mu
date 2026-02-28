import { randomUUID } from 'crypto';
import type { Reservation } from '../entities/reservation.entity';
import { CancellationWindowExpiredError } from '../errors/ordering-errors';

/**
 * Generates a QR code token for a reservation.
 * Uses a UUID v4 as an opaque token — no image generation required at this layer.
 *
 * @returns A UUID v4 string
 */
export function generateQrCode(): string {
  return randomUUID();
}

/**
 * Generates a random 6-digit PIN code for pickup validation.
 * The PIN is zero-padded to always be exactly 6 characters.
 *
 * @returns A 6-character string (e.g., "042837")
 */
export function generatePin(): string {
  const pin = Math.floor(Math.random() * 1_000_000);
  return pin.toString().padStart(6, '0');
}

/**
 * Computes the expiration datetime for a newly created reservation.
 * By default, reservations expire 5 minutes after creation.
 *
 * @param now - The current time (defaults to Date.now())
 * @param holdMinutes - Duration of the hold in minutes (default 5)
 * @returns The expiration datetime
 */
export function computeExpiresAt(
  now: Date = new Date(),
  holdMinutes = 5,
): Date {
  return new Date(now.getTime() + holdMinutes * 60 * 1_000);
}

/**
 * Validates that a consumer cancellation is permitted.
 * Consumers can only cancel before the pickup window starts.
 *
 * Throws CancellationWindowExpiredError if the pickup window has already started.
 *
 * @param reservation - The reservation to cancel
 * @param pickupStart - The start of the pickup window for the basket
 * @param now - The current time (defaults to new Date())
 */
export function assertConsumerCanCancel(
  reservation: Reservation,
  pickupStart: Date,
  now: Date = new Date(),
): void {
  if (now >= pickupStart) {
    throw new CancellationWindowExpiredError(reservation.id);
  }
}

/**
 * Validates a pickup code (QR or PIN) against the reservation.
 * Returns true if the code matches, false otherwise.
 *
 * @param reservation - The reservation to validate against
 * @param qrCode - Optional QR code to check
 * @param pinCode - Optional PIN code to check
 * @returns true if either qrCode or pinCode matches
 */
export function isPickupCodeValid(
  reservation: Reservation,
  qrCode?: string,
  pinCode?: string,
): boolean {
  if (qrCode && reservation.qrCode === qrCode) {
    return true;
  }
  if (pinCode && reservation.pinCode === pinCode) {
    return true;
  }
  return false;
}
