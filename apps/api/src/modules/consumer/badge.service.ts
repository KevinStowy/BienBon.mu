import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import type { BadgeResponseDto } from './dto/badge-response.dto';

/**
 * Service handling badge listing and earned status.
 *
 * Badges are system-defined and earned automatically by the gamification BC.
 * This service exposes read-only views of badges with earned status for the
 * current user.
 */
@Injectable()
export class BadgeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all badges with earned status for the given user.
   * This endpoint is public — userId may be null.
   */
  async listAllBadges(userId: string | null): Promise<BadgeResponseDto[]> {
    const badges = await this.prisma.badge.findMany({
      orderBy: { threshold: 'asc' },
      include:
        userId !== null
          ? {
              userBadges: {
                where: { userId },
                select: { earnedAt: true },
              },
            }
          : { userBadges: false },
    });

    return badges.map((badge) => {
      const userBadge = userId !== null && 'userBadges' in badge ? (badge.userBadges as { earnedAt: Date }[])[0] : undefined;

      return {
        id: badge.id,
        slug: badge.slug,
        namesFr: badge.namesFr,
        namesEn: badge.namesEn,
        threshold: badge.threshold,
        thresholdType: badge.thresholdType,
        iconUrl: badge.iconUrl,
        earned: userBadge !== undefined,
        earnedAt: userBadge?.earnedAt ?? null,
        createdAt: badge.createdAt,
      };
    });
  }

  /**
   * List only badges earned by the given user.
   */
  async listEarnedBadges(userId: string): Promise<BadgeResponseDto[]> {
    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: { earnedAt: 'desc' },
    });

    return userBadges.map(({ badge, earnedAt }) => ({
      id: badge.id,
      slug: badge.slug,
      namesFr: badge.namesFr,
      namesEn: badge.namesEn,
      threshold: badge.threshold,
      thresholdType: badge.thresholdType,
      iconUrl: badge.iconUrl,
      earned: true,
      earnedAt,
      createdAt: badge.createdAt,
    }));
  }
}
