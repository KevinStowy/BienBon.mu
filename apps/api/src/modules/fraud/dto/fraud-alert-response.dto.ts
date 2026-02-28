import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FraudAlertSeverity, FraudAlertStatus } from '@bienbon/shared-types';

/**
 * API response DTO for a fraud alert.
 */
export class FraudAlertResponseDto {
  @ApiProperty({ description: 'Alert ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ description: 'Type of fraud alert', example: 'REPEATED_NO_SHOW' })
  alertType!: string;

  @ApiProperty({
    description: 'Type of actor who triggered the alert',
    enum: ['CONSUMER', 'PARTNER'],
    example: 'CONSUMER',
  })
  actorType!: string;

  @ApiProperty({
    description: 'ID of the actor who triggered the alert',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  actorId!: string;

  @ApiProperty({
    description: 'Severity of the alert',
    enum: FraudAlertSeverity,
    example: FraudAlertSeverity.HIGH,
  })
  severity!: FraudAlertSeverity;

  @ApiProperty({
    description: 'Additional details about the alert',
    example: { noShowCount: 4, windowDays: 30 },
  })
  details!: Record<string, unknown>;

  @ApiProperty({
    description: 'Current status of the alert',
    enum: FraudAlertStatus,
    example: FraudAlertStatus.NEW,
  })
  status!: FraudAlertStatus;

  @ApiPropertyOptional({
    description: 'Admin comment when resolving the alert',
  })
  adminComment?: string;

  @ApiPropertyOptional({
    description: 'ID of the admin who resolved the alert',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  resolvedBy?: string;

  @ApiPropertyOptional({
    description: 'ID of the fraud rule that triggered this alert',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  ruleId?: string;

  @ApiPropertyOptional({
    description: 'Actual metric value at time of alert',
    example: 4,
  })
  metricValue?: number;

  @ApiPropertyOptional({
    description: 'Threshold value configured in the rule',
    example: 3,
  })
  thresholdValue?: number;

  @ApiPropertyOptional({
    description: 'Action taken when the alert was triggered',
    enum: ['FLAG', 'BLOCK', 'SUSPEND'],
    example: 'FLAG',
  })
  actionTaken?: string;

  @ApiPropertyOptional({
    description: 'ID of the automatic suspension created by this alert',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  autoSuspensionId?: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2026-02-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-02-28T12:00:00.000Z' })
  updatedAt!: Date;
}
