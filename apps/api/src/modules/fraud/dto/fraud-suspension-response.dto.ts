import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuspensionStatus } from '@bienbon/shared-types';

/**
 * API response DTO for a fraud suspension.
 */
export class FraudSuspensionResponseDto {
  @ApiProperty({ description: 'Suspension ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({
    description: 'ID of the suspended user',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId!: string;

  @ApiProperty({
    description: 'ID of the fraud alert that triggered this suspension',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  alertId!: string;

  @ApiProperty({
    description: 'ID of the fraud rule that generated the alert',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  ruleId!: string;

  @ApiProperty({
    description: 'Type of suspension (e.g. ORDERING_BLOCKED, ACCOUNT_SUSPENDED)',
    example: 'ORDERING_BLOCKED',
  })
  suspensionType!: string;

  @ApiPropertyOptional({
    description: 'Duration of the suspension in hours (null = indefinite)',
    example: 72,
  })
  durationHours?: number;

  @ApiProperty({
    description: 'Reason for suspension in French',
    example: 'Trop de no-shows consécutifs.',
  })
  reasonFr!: string;

  @ApiPropertyOptional({
    description: 'Reason for suspension in English',
    example: 'Too many consecutive no-shows.',
  })
  reasonEn?: string;

  @ApiProperty({
    description: 'Current suspension status',
    enum: SuspensionStatus,
    example: SuspensionStatus.ACTIVE,
  })
  status!: SuspensionStatus;

  @ApiPropertyOptional({
    description: 'Timestamp when the suspension was lifted',
    example: '2026-03-01T12:00:00.000Z',
  })
  liftedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of the admin who lifted the suspension',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  liftedBy?: string;

  @ApiPropertyOptional({
    description: 'Comment provided when lifting the suspension',
    example: 'User appealed successfully.',
  })
  liftComment?: string;

  @ApiProperty({ description: 'Number of reservations cancelled due to this suspension', example: 0 })
  reservationsCancelled!: number;

  @ApiProperty({ description: 'Number of refunds issued due to this suspension', example: 0 })
  refundsIssued!: number;

  @ApiProperty({ description: 'Creation timestamp', example: '2026-02-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2026-02-28T12:00:00.000Z' })
  updatedAt!: Date;
}
