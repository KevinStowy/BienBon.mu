import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum mirroring Prisma's ReferralStatus for OpenAPI documentation.
 */
export enum ReferralStatusEnum {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * Response DTO for a referral entry.
 */
export class ReferralResponseDto {
  @ApiProperty({
    description: 'Referral ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'ID of the user who issued the referral code',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  referrerId!: string;

  @ApiProperty({
    description: 'The referral code used',
    example: 'ABC12345',
  })
  referralCode!: string;

  @ApiPropertyOptional({
    description: 'ID of the user who used the code (referee)',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  refereeId?: string | null;

  @ApiProperty({
    description: 'Current referral status',
    enum: ReferralStatusEnum,
    example: ReferralStatusEnum.PENDING,
  })
  status!: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the reward was granted',
    example: '2026-02-28T12:00:00.000Z',
  })
  rewardGrantedAt?: Date | null;

  @ApiProperty({
    description: 'Referral creation timestamp',
    example: '2026-02-28T12:00:00.000Z',
  })
  createdAt!: Date;
}

/**
 * Response DTO for the referral code endpoint.
 */
export class ReferralCodeResponseDto {
  @ApiProperty({
    description: 'The consumer referral code',
    example: 'ABC12345',
  })
  referralCode!: string;
}
