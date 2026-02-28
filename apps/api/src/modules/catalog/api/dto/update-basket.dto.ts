import { ApiPropertyOptional } from '@nestjs/swagger';
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
 * DTO for updating a DRAFT basket. All fields are optional.
 */
export class UpdateBasketDto {
  @ApiPropertyOptional({ description: 'Basket title', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  title?: string;

  @ApiPropertyOptional({ description: 'Basket description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Original retail price in MUR' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  originalPrice?: number;

  @ApiPropertyOptional({ description: 'Selling price (must be <= 50% of original price) in MUR' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  sellingPrice?: number;

  @ApiPropertyOptional({ description: 'Total quantity available', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Pickup window start (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  pickupStart?: string;

  @ApiPropertyOptional({ description: 'Pickup window end (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  pickupEnd?: string;

  @ApiPropertyOptional({ description: 'Tag IDs to associate with the basket', isArray: true, type: String })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
