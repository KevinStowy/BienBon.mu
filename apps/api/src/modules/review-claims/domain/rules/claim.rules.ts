// =============================================================================
// Claim Domain Rules — pure functions, no side effects (ADR-027)
// =============================================================================

/**
 * Returns true if the claim was opened within the 24-hour window after pickup.
 */
export function isWithinClaimWindow(pickedUpAt: Date, now: Date = new Date()): boolean {
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  return now.getTime() - pickedUpAt.getTime() <= windowMs;
}

/**
 * Returns true if a claim can be opened for the given reservation.
 * Requires the reservation to be in PICKED_UP status and within the 24h window.
 */
export function canOpenClaim(
  reservation: { status: string; pickedUpAt: Date | null },
): boolean {
  return (
    reservation.status === 'PICKED_UP' &&
    reservation.pickedUpAt !== null &&
    isWithinClaimWindow(reservation.pickedUpAt)
  );
}

/**
 * Returns true if the description meets the minimum length requirement (20 chars).
 */
export function isDescriptionValid(description: string): boolean {
  return description.trim().length >= 20;
}

/**
 * Returns true if the photo count is within acceptable bounds (0-5).
 */
export function isPhotoCountValid(count: number): boolean {
  return count >= 0 && count <= 5;
}
