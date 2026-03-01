// =============================================================================
// ReferralService — unit tests (ADR-023)
// =============================================================================
// Tests the referral code generation and application rules.
// Mocks PrismaService to avoid real DB calls.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferralService } from '../referral.service';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/domain-error';

// ---------------------------------------------------------------------------
// Prisma mock factory
// ---------------------------------------------------------------------------

function makePrismaMock() {
  return {
    consumerProfile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    referral: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Helper data
// ---------------------------------------------------------------------------

const REFERRER_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const REFEREE_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const REFERRAL_CODE = 'ABC12345';

function makeReferralRecord(overrides = {}) {
  return {
    id: 'ref-001',
    referrerId: REFERRER_ID,
    referralCode: REFERRAL_CODE,
    refereeId: REFEREE_ID,
    status: 'PENDING',
    rewardGrantedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getReferralCode
// ---------------------------------------------------------------------------

describe('ReferralService.getReferralCode', () => {
  let service: ReferralService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    service = new ReferralService(prismaMock as never);
  });

  it('throws NotFoundError when consumer profile does not exist', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce(null);

    await expect(service.getReferralCode(REFERRER_ID)).rejects.toThrow(NotFoundError);
  });

  it('returns existing referral code without generating a new one', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({
      referralCode: REFERRAL_CODE,
    });

    const result = await service.getReferralCode(REFERRER_ID);

    expect(result.referralCode).toBe(REFERRAL_CODE);
    expect(prismaMock.consumerProfile.update).not.toHaveBeenCalled();
  });

  it('generates a new code when profile has no referral code yet', async () => {
    // First findUnique: profile exists but has no code
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({ referralCode: null });
    // Second findUnique: code collision check — no collision
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce(null);
    prismaMock.consumerProfile.update.mockResolvedValueOnce({ referralCode: 'GENERATED' });

    const result = await service.getReferralCode(REFERRER_ID);

    expect(prismaMock.consumerProfile.update).toHaveBeenCalledOnce();
    expect(result.referralCode).toBeDefined();
    expect(typeof result.referralCode).toBe('string');
  });

  it('generated code is exactly 8 characters long', async () => {
    prismaMock.consumerProfile.findUnique
      .mockResolvedValueOnce({ referralCode: null })
      .mockResolvedValueOnce(null); // no collision

    let capturedCode: string = '';
    prismaMock.consumerProfile.update.mockImplementationOnce(
      ({ data }: { data: { referralCode: string } }) => {
        capturedCode = data.referralCode;
        return { referralCode: data.referralCode };
      },
    );

    await service.getReferralCode(REFERRER_ID);

    expect(capturedCode).toHaveLength(8);
  });

  it('generated code uses only uppercase alphanumeric characters (no ambiguous chars)', async () => {
    prismaMock.consumerProfile.findUnique
      .mockResolvedValueOnce({ referralCode: null })
      .mockResolvedValueOnce(null);

    let capturedCode: string = '';
    prismaMock.consumerProfile.update.mockImplementationOnce(
      ({ data }: { data: { referralCode: string } }) => {
        capturedCode = data.referralCode;
        return { referralCode: data.referralCode };
      },
    );

    await service.getReferralCode(REFERRER_ID);

    // CODE_ALPHABET from service: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    // No O, I, 1, 0 to avoid confusion with 0/O and 1/I
    expect(capturedCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it('retries code generation on collision and produces a unique code', async () => {
    prismaMock.consumerProfile.findUnique
      .mockResolvedValueOnce({ referralCode: null }) // profile check
      .mockResolvedValueOnce({ id: 'existing-profile' }) // collision attempt 1
      .mockResolvedValueOnce(null); // attempt 2 — no collision

    prismaMock.consumerProfile.update.mockResolvedValueOnce({ referralCode: 'NEWCODE1' });

    const result = await service.getReferralCode(REFERRER_ID);
    expect(result.referralCode).toBeDefined();
    // findUnique should have been called 3 times (profile + 2 collision checks)
    expect(prismaMock.consumerProfile.findUnique).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// applyReferralCode
// ---------------------------------------------------------------------------

describe('ReferralService.applyReferralCode', () => {
  let service: ReferralService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    service = new ReferralService(prismaMock as never);
  });

  it('throws NotFoundError when the referral code does not exist', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce(null);

    await expect(service.applyReferralCode(REFEREE_ID, 'INVALID9')).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError when consumer tries to apply their own code (self-referral)', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({
      userId: REFEREE_ID, // referrer is the same as referee
    });

    await expect(service.applyReferralCode(REFEREE_ID, REFERRAL_CODE)).rejects.toThrow(
      ValidationError,
    );
  });

  it('throws ConflictError when referee has already applied a referral code', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({
      userId: REFERRER_ID,
    });
    prismaMock.referral.findFirst.mockResolvedValueOnce({
      id: 'existing-referral',
      refereeId: REFEREE_ID,
    });

    await expect(service.applyReferralCode(REFEREE_ID, REFERRAL_CODE)).rejects.toThrow(
      ConflictError,
    );
  });

  it('creates a PENDING referral when all guards pass', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({
      userId: REFERRER_ID,
    });
    prismaMock.referral.findFirst.mockResolvedValueOnce(null);
    prismaMock.referral.create.mockResolvedValueOnce(makeReferralRecord());

    const result = await service.applyReferralCode(REFEREE_ID, REFERRAL_CODE);

    expect(prismaMock.referral.create).toHaveBeenCalledOnce();
    expect(prismaMock.referral.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referrerId: REFERRER_ID,
          refereeId: REFEREE_ID,
          referralCode: REFERRAL_CODE,
          status: 'PENDING',
        }),
      }),
    );
    expect(result.status).toBe('PENDING');
    expect(result.referrerId).toBe(REFERRER_ID);
    expect(result.refereeId).toBe(REFEREE_ID);
  });

  it('does not create a referral when code is invalid', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce(null);

    await expect(service.applyReferralCode(REFEREE_ID, 'BADCODE1')).rejects.toThrow();
    expect(prismaMock.referral.create).not.toHaveBeenCalled();
  });

  it('does not create a referral on self-referral', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({ userId: REFEREE_ID });

    await expect(service.applyReferralCode(REFEREE_ID, REFERRAL_CODE)).rejects.toThrow();
    expect(prismaMock.referral.create).not.toHaveBeenCalled();
  });

  it('error code is SELF_REFERRAL_NOT_ALLOWED for self-referral', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({ userId: REFEREE_ID });

    let error: unknown;
    try {
      await service.applyReferralCode(REFEREE_ID, REFERRAL_CODE);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).code).toBe('SELF_REFERRAL_NOT_ALLOWED');
  });

  it('error code is REFERRAL_ALREADY_USED when referee already has a referral', async () => {
    prismaMock.consumerProfile.findUnique.mockResolvedValueOnce({ userId: REFERRER_ID });
    prismaMock.referral.findFirst.mockResolvedValueOnce({ id: 'existing-ref' });

    let error: unknown;
    try {
      await service.applyReferralCode(REFEREE_ID, REFERRAL_CODE);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).code).toBe('REFERRAL_ALREADY_USED');
  });
});
