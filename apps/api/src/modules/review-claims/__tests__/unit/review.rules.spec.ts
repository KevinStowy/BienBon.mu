// =============================================================================
// Review Domain Rules Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  isRatingValid,
  isWithinReviewWindow,
  isReviewEditable,
} from '../../domain/rules/review.rules';

describe('isRatingValid', () => {
  it('returns true for rating 1 (minimum)', () => {
    expect(isRatingValid(1)).toBe(true);
  });

  it('returns true for rating 5 (maximum)', () => {
    expect(isRatingValid(5)).toBe(true);
  });

  it('returns true for rating 3 (middle)', () => {
    expect(isRatingValid(3)).toBe(true);
  });

  it('returns false for rating 0 (below minimum)', () => {
    expect(isRatingValid(0)).toBe(false);
  });

  it('returns false for rating 6 (above maximum)', () => {
    expect(isRatingValid(6)).toBe(false);
  });

  it('returns false for a float like 3.5', () => {
    expect(isRatingValid(3.5)).toBe(false);
  });

  it('returns false for a negative value', () => {
    expect(isRatingValid(-1)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isRatingValid(NaN)).toBe(false);
  });
});

describe('isWithinReviewWindow', () => {
  it('returns true when within the 24h window', () => {
    const pickedUpAt = new Date(Date.now() - 23 * 60 * 60 * 1000);
    expect(isWithinReviewWindow(pickedUpAt)).toBe(true);
  });

  it('returns true at exactly 24h', () => {
    const now = new Date();
    const pickedUpAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(isWithinReviewWindow(pickedUpAt, now)).toBe(true);
  });

  it('returns false at 24h + 1ms', () => {
    const now = new Date();
    const pickedUpAt = new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1);
    expect(isWithinReviewWindow(pickedUpAt, now)).toBe(false);
  });

  it('returns false for a past pickup beyond the window', () => {
    const pickedUpAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    expect(isWithinReviewWindow(pickedUpAt)).toBe(false);
  });
});

describe('isReviewEditable', () => {
  it('returns true when editableUntil is in the future', () => {
    const editableUntil = new Date(Date.now() + 60 * 1000); // 1 minute from now
    expect(isReviewEditable(editableUntil)).toBe(true);
  });

  it('returns true at exactly the editableUntil timestamp', () => {
    const now = new Date();
    expect(isReviewEditable(now, now)).toBe(true);
  });

  it('returns false when editableUntil is 1ms in the past', () => {
    const now = new Date();
    const editableUntil = new Date(now.getTime() - 1);
    expect(isReviewEditable(editableUntil, now)).toBe(false);
  });

  it('returns false when editableUntil is well in the past', () => {
    const editableUntil = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isReviewEditable(editableUntil)).toBe(false);
  });
});
