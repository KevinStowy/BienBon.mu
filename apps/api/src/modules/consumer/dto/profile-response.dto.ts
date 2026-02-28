import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for a consumer profile.
 */
export class ConsumerProfileResponseDto {
  @ApiProperty({
    description: 'Profile ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'User ID this profile belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId!: string;

  @ApiProperty({
    description: 'List of dietary preference slugs',
    type: [String],
    example: ['vegan', 'gluten-free'],
  })
  dietaryPreferences!: string[];

  @ApiPropertyOptional({
    description: 'Referral code for sharing with friends',
    example: 'ABC12345',
  })
  referralCode?: string | null;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    example: { pushEnabled: true, emailEnabled: false },
  })
  notificationPreferences?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Profile creation timestamp',
    example: '2026-02-28T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Profile last update timestamp',
    example: '2026-02-28T12:00:00.000Z',
  })
  updatedAt!: Date;
}
