import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * API response DTO for a basket.
 * Maps from the domain Basket entity to a JSON-serializable shape.
 */
export class BasketResponseDto {
  @ApiProperty({ description: 'Basket ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Store ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  storeId!: string;

  @ApiPropertyOptional({ description: 'Template ID if created from a recurring template' })
  templateId?: string;

  @ApiProperty({ description: 'Basket title', example: 'Pain perdu du matin' })
  title!: string;

  @ApiPropertyOptional({ description: 'Basket description' })
  description?: string;

  @ApiProperty({ description: 'Original retail price in MUR', example: 500 })
  originalPrice!: number;

  @ApiProperty({ description: 'Selling price in MUR', example: 200 })
  sellingPrice!: number;

  @ApiProperty({ description: 'Total quantity', example: 5 })
  quantity!: number;

  @ApiProperty({ description: 'Remaining stock', example: 3 })
  stock!: number;

  @ApiProperty({ description: 'Category ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  photoUrl?: string;

  @ApiProperty({ description: 'Pickup window start', example: '2026-03-01T08:00:00.000Z' })
  pickupStart!: Date;

  @ApiProperty({ description: 'Pickup window end', example: '2026-03-01T10:00:00.000Z' })
  pickupEnd!: Date;

  @ApiProperty({
    description: 'Basket status',
    enum: ['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'PICKUP_WINDOW', 'ENDED', 'CANCELLED', 'ARCHIVED'],
    example: 'PUBLISHED',
  })
  status!: string;

  @ApiProperty({ description: 'Associated tag IDs', type: [String], example: [] })
  tagIds!: string[];

  @ApiProperty({ description: 'Creation timestamp', example: '2026-02-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-02-28T12:00:00.000Z' })
  updatedAt!: Date;
}

/**
 * Response DTO for stock decrement.
 */
export class StockDecrementResponseDto {
  @ApiProperty({ description: 'Remaining stock after decrement', example: 2 })
  remainingStock!: number;
}
