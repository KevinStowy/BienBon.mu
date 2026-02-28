import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination.dto';
import { FraudAlertSeverity, FraudAlertStatus } from '@bienbon/shared-types';

/**
 * Query parameters for listing fraud alerts.
 * Extends PaginationQueryDto with fraud-specific filters.
 */
export class ListAlertsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by alert status',
    enum: FraudAlertStatus,
    example: FraudAlertStatus.NEW,
  })
  @IsOptional()
  @IsEnum(FraudAlertStatus)
  status?: FraudAlertStatus;

  @ApiPropertyOptional({
    description: 'Filter by alert severity',
    enum: FraudAlertSeverity,
    example: FraudAlertSeverity.HIGH,
  })
  @IsOptional()
  @IsEnum(FraudAlertSeverity)
  severity?: FraudAlertSeverity;

  @ApiPropertyOptional({
    description: 'Filter by actor type',
    enum: ['CONSUMER', 'PARTNER'],
    example: 'CONSUMER',
  })
  @IsOptional()
  @IsEnum(['CONSUMER', 'PARTNER'])
  actorType?: 'CONSUMER' | 'PARTNER';

  @ApiPropertyOptional({
    description: 'Filter by actor ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  actorId?: string;
}
