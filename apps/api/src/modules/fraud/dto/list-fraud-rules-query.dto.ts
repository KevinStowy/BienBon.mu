import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../shared/dto/pagination.dto';

const ACTOR_TYPES = ['CONSUMER', 'PARTNER'] as const;

/**
 * Query parameters for listing fraud rules.
 * Extends PaginationQueryDto with rule-specific filters.
 */
export class ListFraudRulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by actor type',
    enum: ACTOR_TYPES,
    example: 'CONSUMER',
  })
  @IsOptional()
  @IsEnum(ACTOR_TYPES)
  actorType?: 'CONSUMER' | 'PARTNER';

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;
}
