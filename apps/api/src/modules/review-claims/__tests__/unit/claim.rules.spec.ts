// =============================================================================
// Claim Domain Rules Tests
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  isWithinClaimWindow,
  canOpenClaim,
  isDescriptionValid,
  isPhotoCountValid,
} from '../../domain/rules/claim.rules';

describe('isWithinClaimWindow', () => {
  it('returns true when within the 24h window', () => {
    const pickedUpAt = new Date(Date.now() - 23 * 60 * 60 * 1000); // 23 hours ago
    expect(isWithinClaimWindow(pickedUpAt)).toBe(true);
  });

  it('returns true at exactly 24h', () => {
    const now = new Date();
    const pickedUpAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // exactly 24h ago
    expect(isWithinClaimWindow(pickedUpAt, now)).toBe(true);
  });

  it('returns false at 24h + 1ms', () => {
    const now = new Date();
    const pickedUpAt = new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1);
    expect(isWithinClaimWindow(pickedUpAt, now)).toBe(false);
  });

  it('returns false when well past the 24h window', () => {
    const pickedUpAt = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
    expect(isWithinClaimWindow(pickedUpAt)).toBe(false);
  });

  it('returns true when pickedUpAt is in the future (edge case)', () => {
    const pickedUpAt = new Date(Date.now() + 1000);
    expect(isWithinClaimWindow(pickedUpAt)).toBe(true);
  });
});

describe('canOpenClaim', () => {
  it('returns true for a PICKED_UP reservation within the window', () => {
    const pickedUpAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
    expect(canOpenClaim({ status: 'PICKED_UP', pickedUpAt })).toBe(true);
  });

  it('returns false for a non PICKED_UP status', () => {
    const pickedUpAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(canOpenClaim({ status: 'CONFIRMED', pickedUpAt })).toBe(false);
  });

  it('returns false when pickedUpAt is null', () => {
    expect(canOpenClaim({ status: 'PICKED_UP', pickedUpAt: null })).toBe(false);
  });

  it('returns false when the 24h window has expired', () => {
    const pickedUpAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    expect(canOpenClaim({ status: 'PICKED_UP', pickedUpAt })).toBe(false);
  });

  it('returns false for CANCELLED status even with valid pickedUpAt', () => {
    const pickedUpAt = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(canOpenClaim({ status: 'CANCELLED_CONSUMER', pickedUpAt })).toBe(false);
  });
});

describe('isDescriptionValid', () => {
  it('returns true for a description with exactly 20 characters', () => {
    expect(isDescriptionValid('12345678901234567890')).toBe(true);
  });

  it('returns true for a description with more than 20 characters', () => {
    expect(isDescriptionValid('This is a valid description for a claim')).toBe(true);
  });

  it('returns false for a description with fewer than 20 characters', () => {
    expect(isDescriptionValid('Too short')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isDescriptionValid('')).toBe(false);
  });

  it('returns false for a string with 19 printable chars + whitespace only', () => {
    expect(isDescriptionValid('   1234567890123456')).toBe(false); // 3 spaces + 16 chars = 16 after trim
  });

  it('returns true when exactly 20 characters after trimming', () => {
    expect(isDescriptionValid('  12345678901234567890  ')).toBe(true);
  });
});

describe('isPhotoCountValid', () => {
  it('returns true for 0 photos', () => {
    expect(isPhotoCountValid(0)).toBe(true);
  });

  it('returns true for 5 photos (max)', () => {
    expect(isPhotoCountValid(5)).toBe(true);
  });

  it('returns false for 6 photos (over limit)', () => {
    expect(isPhotoCountValid(6)).toBe(false);
  });

  it('returns false for a negative count', () => {
    expect(isPhotoCountValid(-1)).toBe(false);
  });

  it('returns true for intermediate values', () => {
    expect(isPhotoCountValid(3)).toBe(true);
  });
});
