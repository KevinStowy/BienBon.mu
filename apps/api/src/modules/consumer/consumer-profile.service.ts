import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotFoundError } from '../../shared/errors/domain-error';
import type { ProfileResponseDto } from './dto/profile-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Service handling consumer profile CRUD operations.
 *
 * Profile is auto-created on first access (GET /consumer/profile).
 */
@Injectable()
export class ConsumerProfileService {
  private readonly logger = new Logger(ConsumerProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the authenticated consumer's profile.
   * If no profile exists yet, one is created with default values.
   */
  async getOrCreateProfile(userId: string): Promise<ProfileResponseDto> {
    const existing = await this.prisma.consumerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      return this.toResponseDto(existing);
    }

    this.logger.log(`Auto-creating consumer profile for user ${userId}`);

    const created = await this.prisma.consumerProfile.create({
      data: {
        userId,
        dietaryPreferences: [],
        notificationPreferences: Prisma.JsonNull,
        referralCode: null,
      },
    });

    return this.toResponseDto(created);
  }

  /**
   * Update the authenticated consumer's profile.
   * Throws NotFoundError if the profile does not exist.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const existing = await this.prisma.consumerProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundError('CONSUMER_PROFILE_NOT_FOUND', `Consumer profile not found for user ${userId}`);
    }

    const updated = await this.prisma.consumerProfile.update({
      where: { userId },
      data: {
        ...(dto.dietaryPreferences !== undefined && { dietaryPreferences: dto.dietaryPreferences }),
        ...(dto.notificationPreferences !== undefined && {
          notificationPreferences: dto.notificationPreferences as Prisma.InputJsonValue,
        }),
      },
    });

    return this.toResponseDto(updated);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toResponseDto(record: {
    id: string;
    userId: string;
    dietaryPreferences: string[];
    referralCode: string | null;
    notificationPreferences: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ProfileResponseDto {
    return {
      id: record.id,
      userId: record.userId,
      dietaryPreferences: record.dietaryPreferences,
      referralCode: record.referralCode,
      notificationPreferences: record.notificationPreferences as Record<string, unknown> | null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
