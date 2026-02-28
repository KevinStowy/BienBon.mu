import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FraudAlertSeverity } from '@bienbon/shared-types';

/**
 * API response DTO for a fraud rule.
 */
export class FraudRuleResponseDto {
  @ApiProperty({ description: 'Rule ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Unique slug identifier', example: 'consumer-no-show-3d' })
  slug!: string;

  @ApiProperty({ description: 'Rule name in French', example: 'Absence répétée (consommateur)' })
  nameFr!: string;

  @ApiPropertyOptional({ description: 'Rule name in English', example: 'Repeated no-show (consumer)' })
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Rule description in French' })
  descriptionFr?: string;

  @ApiPropertyOptional({ description: 'Rule description in English' })
  descriptionEn?: string;

  @ApiProperty({
    description: 'Actor type the rule applies to',
    enum: ['CONSUMER', 'PARTNER'],
    example: 'CONSUMER',
  })
  actorType!: string;

  @ApiProperty({ description: 'Metric being measured', example: 'no_shows' })
  metric!: string;

  @ApiProperty({
    description: 'Comparison operator',
    enum: ['GT', 'GTE', 'LT', 'LTE', 'EQ'],
    example: 'GT',
  })
  operator!: string;

  @ApiProperty({ description: 'Threshold value', example: 3 })
  threshold!: number;

  @ApiPropertyOptional({ description: 'Time window in days', example: 30 })
  windowDays?: number;

  @ApiPropertyOptional({ description: 'Time window in hours', example: 24 })
  windowHours?: number;

  @ApiPropertyOptional({ description: 'Time window in minutes', example: 60 })
  windowMinutes?: number;

  @ApiProperty({ description: 'Minimum sample size', example: 1 })
  minSampleSize!: number;

  @ApiProperty({
    description: 'Action taken when rule triggers',
    enum: ['FLAG', 'BLOCK', 'SUSPEND'],
    example: 'FLAG',
  })
  action!: string;

  @ApiProperty({
    description: 'Severity of generated alerts',
    enum: FraudAlertSeverity,
    enumName: 'FraudAlertSeverity',
    example: FraudAlertSeverity.MEDIUM,
  })
  severity!: FraudAlertSeverity;

  @ApiProperty({ description: 'Whether the rule is currently active', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Cooldown period in hours', example: 24 })
  cooldownHours!: number;

  @ApiProperty({ description: 'Creation timestamp', example: '2026-02-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-02-28T12:00:00.000Z' })
  updatedAt!: Date;
}
