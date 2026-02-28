import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Shared pagination query DTO with class-validator decorators.
 * Attach as a query parameter to list endpoints.
 *
 * @example
 * ```typescript
 * @Get()
 * findAll(@Query() pagination: PaginationQueryDto) { ... }
 * ```
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Field name to sort by',
    example: 'created_at',
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
    example: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'] as const)
  sort_order: 'asc' | 'desc' = 'asc';
}

/**
 * Metadata for paginated responses.
 */
export class PaginationMeta {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total number of items', example: 150 })
  total!: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  totalPages!: number;
}

/**
 * Generic paginated response wrapper.
 *
 * @example
 * ```typescript
 * const response = PaginatedResponseDto.create(baskets, total, query);
 * ```
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items', isArray: true })
  data!: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
  meta!: PaginationMeta;

  /**
   * Factory method to create a paginated response from query results.
   */
  static create<T>(
    data: T[],
    total: number,
    query: PaginationQueryDto,
  ): PaginatedResponseDto<T> {
    const response = new PaginatedResponseDto<T>();
    response.data = data;
    response.meta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
    return response;
  }
}
