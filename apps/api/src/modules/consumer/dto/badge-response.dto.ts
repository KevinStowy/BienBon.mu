import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for a badge, optionally enriched with earned status.
 */
export class BadgeResponseDto {
  @ApiProperty({
    description: 'Badge ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Unique badge slug identifier',
    example: 'first-basket',
  })
  slug!: string;

  @ApiProperty({
    description: 'Badge name in French',
    example: 'Premier panier',
  })
  namesFr!: string;

  @ApiPropertyOptional({
    description: 'Badge name in English',
    example: 'First Basket',
  })
  namesEn?: string | null;

  @ApiProperty({
    description: 'Threshold value to earn the badge',
    example: 1,
  })
  threshold!: number;

  @ApiProperty({
    description: 'Type of threshold (e.g. baskets_count, co2_saved)',
    example: 'baskets_count',
  })
  thresholdType!: string;

  @ApiPropertyOptional({
    description: 'URL of the badge icon',
    example: 'https://cdn.bienbon.mu/badges/first-basket.png',
  })
  iconUrl?: string | null;

  @ApiProperty({
    description: 'Whether the current user has earned this badge',
    example: true,
  })
  earned!: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when the badge was earned (null if not earned)',
    example: '2026-02-15T10:00:00.000Z',
  })
  earnedAt?: Date | null;

  @ApiProperty({
    description: 'Badge creation timestamp',
    example: '2026-02-28T12:00:00.000Z',
  })
  createdAt!: Date;
}
