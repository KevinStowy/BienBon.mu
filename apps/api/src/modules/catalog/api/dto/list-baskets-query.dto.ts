import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../shared/dto/pagination.dto';

/**
 * Query DTO for listing available baskets with filters.
 */
export class ListBasketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by tag IDs (comma-separated)',
    example: 'id1,id2,id3',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') return value.split(',').filter(Boolean);
    return value;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  tag_ids?: string[];

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'PICKUP_WINDOW', 'ENDED', 'CANCELLED', 'ARCHIVED'],
    default: 'PUBLISHED',
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'SOLD_OUT', 'PICKUP_WINDOW', 'ENDED', 'CANCELLED', 'ARCHIVED'])
  status?: string;

  @ApiPropertyOptional({ description: 'Minimum selling price in MUR', example: 100 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum selling price in MUR', example: 500 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  max_price?: number;

  @ApiPropertyOptional({ description: 'Filter baskets with pickup starting after this date (ISO 8601)', example: '2026-03-01T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  pickup_after?: string;

  @ApiPropertyOptional({ description: 'Filter baskets with pickup ending before this date (ISO 8601)', example: '2026-03-01T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  pickup_before?: string;

  @ApiPropertyOptional({ description: 'Latitude for geo filter', example: -20.1619 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude for geo filter', example: 57.4977 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Radius in km for geo filter', example: 5 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  radius_km?: number;
}
