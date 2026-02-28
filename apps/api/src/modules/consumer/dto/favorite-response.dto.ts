import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for a favorite store entry.
 */
export class FavoriteResponseDto {
  @ApiProperty({
    description: 'Favorite entry ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'User ID who favorited the store',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId!: string;

  @ApiProperty({
    description: 'Store ID that was favorited',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  storeId!: string;

  @ApiProperty({
    description: 'Timestamp when the store was favorited',
    example: '2026-02-28T12:00:00.000Z',
  })
  createdAt!: Date;
}
