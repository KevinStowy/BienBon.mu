import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/domain-error';
import { ReferralStatus as PrismaReferralStatus } from '../../generated/prisma/client';
import type { ReferralCodeResponseDto, ReferralResponseDto } from './dto/referral-response.dto';

/**
 * Service handling referral codes and referral application.
 *
 * Referral code generation: 8-character uppercase alphanumeric string
 * generated via Node's crypto module (no external dependency).
 */
@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  /** Characters used for referral code generation — uppercase alphanumeric, no ambiguous chars */
  private static readonly CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private static readonly CODE_LENGTH = 8;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the current user's referral code.
   * If the consumer profile has no code yet, one is generated and saved.
   */
  async getReferralCode(userId: string): Promise<ReferralCodeResponseDto> {
    const profile = await this.prisma.consumerProfile.findUnique({
      where: { userId },
      select: { referralCode: true },
    });

    if (!profile) {
      throw new NotFoundError('CONSUMER_PROFILE_NOT_FOUND', `Consumer profile not found for user ${userId}`);
    }

    if (profile.referralCode) {
      return { referralCode: profile.referralCode };
    }

    // Generate a unique code with retry on collision
    const code = await this.generateUniqueCode();

    await this.prisma.consumerProfile.update({
      where: { userId },
      data: { referralCode: code },
    });

    this.logger.log(`Generated referral code ${code} for user ${userId}`);

    return { referralCode: code };
  }

  /**
   * Apply a referral code.
   *
   * Rules:
   * - The code must exist in the consumer_profiles table.
   * - The referee must not be the referrer.
   * - The referee must not have already applied a referral code.
   */
  async applyReferralCode(refereeId: string, code: string): Promise<ReferralResponseDto> {
    // Find the referrer via their code
    const referrerProfile = await this.prisma.consumerProfile.findUnique({
      where: { referralCode: code },
      select: { userId: true },
    });

    if (!referrerProfile) {
      throw new NotFoundError('REFERRAL_CODE_NOT_FOUND', `Referral code "${code}" does not exist`);
    }

    const referrerId = referrerProfile.userId;

    // Prevent self-referral
    if (referrerId === refereeId) {
      throw new ValidationError('SELF_REFERRAL_NOT_ALLOWED', 'You cannot apply your own referral code');
    }

    // Check if referee has already applied a referral code
    const existingReferral = await this.prisma.referral.findFirst({
      where: { refereeId },
    });

    if (existingReferral) {
      throw new ConflictError('REFERRAL_ALREADY_USED', 'You have already applied a referral code');
    }

    const referral = await this.prisma.referral.create({
      data: {
        referrerId,
        referralCode: code,
        refereeId,
        status: PrismaReferralStatus.PENDING,
      },
    });

    this.logger.log(`User ${refereeId} applied referral code ${code} from user ${referrerId}`);

    return this.toResponseDto(referral);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate a unique 8-character uppercase alphanumeric referral code.
   * Retries on collision (extremely rare with 32^8 = 1 trillion combinations).
   */
  private async generateUniqueCode(attempt = 0): Promise<string> {
    if (attempt > 5) {
      throw new Error('Failed to generate a unique referral code after 5 attempts');
    }

    const code = this.generateCode();

    const existing = await this.prisma.consumerProfile.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });

    if (existing) {
      return this.generateUniqueCode(attempt + 1);
    }

    return code;
  }

  private generateCode(): string {
    const alphabet = ReferralService.CODE_ALPHABET;
    const length = ReferralService.CODE_LENGTH;
    const bytes = randomBytes(length);
    let code = '';

    for (let i = 0; i < length; i++) {
      code += alphabet[bytes[i]! % alphabet.length];
    }

    return code;
  }

  private toResponseDto(record: {
    id: string;
    referrerId: string;
    referralCode: string;
    refereeId: string | null;
    status: string;
    rewardGrantedAt: Date | null;
    createdAt: Date;
  }): ReferralResponseDto {
    return {
      id: record.id,
      referrerId: record.referrerId,
      referralCode: record.referralCode,
      refereeId: record.refereeId,
      status: record.status,
      rewardGrantedAt: record.rewardGrantedAt,
      createdAt: record.createdAt,
    };
  }
}
