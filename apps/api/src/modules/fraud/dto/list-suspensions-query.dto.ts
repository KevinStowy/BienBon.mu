import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination.dto';
import { SuspensionStatus } from '@bienbon/shared-types';

/**
 * Query parameters for listing fraud suspensions.
 * Extends PaginationQueryDto with suspension-specific filters.
 */
export class ListSuspensionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by suspension status',
    enum: SuspensionStatus,
    enumName: 'SuspensionStatus',
    example: SuspensionStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SuspensionStatus)
  status?: SuspensionStatus;

  @ApiPropertyOptional({
    description: 'Filter by user ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
