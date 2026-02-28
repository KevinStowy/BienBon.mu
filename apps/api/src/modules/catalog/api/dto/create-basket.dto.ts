import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsInt,
  IsUUID,
  IsOptional,
  IsUrl,
  IsDateString,
  MaxLength,
  MinLength,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new basket.
 * Validated with class-validator; domain rules enforced in the service layer.
 */
export class CreateBasketDto {
  @ApiProperty({ description: 'Store ID that owns this basket', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ description: 'Basket title', maxLength: 60, example: 'Pain perdu du matin' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title!: string;

  @ApiPropertyOptional({ description: 'Optional basket description', example: 'Assortiment de viennoiseries du jour' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Original retail price in MUR', example: 500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  originalPrice!: number;

  @ApiProperty({ description: 'Selling price (must be <= 50% of original price) in MUR', example: 200 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  sellingPrice!: number;

  @ApiProperty({ description: 'Total quantity available', minimum: 1, example: 5 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ description: 'Category ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Photo URL', example: 'https://cdn.bienbon.mu/baskets/123.jpg' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiProperty({ description: 'Pickup window start (ISO 8601)', example: '2026-03-01T08:00:00.000Z' })
  @IsDateString()
  pickupStart!: string;

  @ApiProperty({ description: 'Pickup window end (ISO 8601)', example: '2026-03-01T10:00:00.000Z' })
  @IsDateString()
  pickupEnd!: string;

  @ApiPropertyOptional({ description: 'Tag IDs to associate with the basket', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'Recurring template ID (if created from a template)' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}
