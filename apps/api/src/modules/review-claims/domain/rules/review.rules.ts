// =============================================================================
// Review Domain Rules — pure functions, no side effects (ADR-027)
// =============================================================================

/**
 * Returns true if the rating is an integer between 1 and 5 inclusive.
 */
export function isRatingValid(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Returns true if the review is being submitted within the 24-hour window after pickup.
 */
export function isWithinReviewWindow(pickedUpAt: Date, now: Date = new Date()): boolean {
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours
  return now.getTime() - pickedUpAt.getTime() <= windowMs;
}

/**
 * Returns true if the review can still be edited (before its editableUntil timestamp).
 */
export function isReviewEditable(editableUntil: Date, now: Date = new Date()): boolean {
  return now.getTime() <= editableUntil.getTime();
}
