import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FraudAlertStatus } from '@bienbon/shared-types';

const RESOLVABLE_STATUSES = [FraudAlertStatus.RESOLVED, FraudAlertStatus.FALSE_POSITIVE] as const;
type ResolvableStatus = (typeof RESOLVABLE_STATUSES)[number];

/**
 * DTO for resolving a fraud alert.
 * Admin must provide the resolution status and an optional comment.
 */
export class ResolveAlertDto {
  @ApiProperty({
    description: 'Resolution status for the alert',
    enum: RESOLVABLE_STATUSES,
    example: FraudAlertStatus.RESOLVED,
  })
  @IsEnum(RESOLVABLE_STATUSES)
  status!: ResolvableStatus;

  @ApiPropertyOptional({
    description: 'Admin comment explaining the resolution decision',
    maxLength: 1000,
    example: 'User confirmed pattern of abuse — account flagged.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminComment?: string;
}
