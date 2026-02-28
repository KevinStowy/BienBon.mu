import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResolutionType } from '@bienbon/shared-types';

export class ResolveClaimDto {
  @ApiProperty({
    description: 'Resolution type',
    enum: ResolutionType,
    enumName: 'ResolutionType',
  })
  @IsEnum(ResolutionType)
  resolutionType!: ResolutionType;

  @ApiPropertyOptional({
    description: 'Refund amount in MUR (required for PARTIAL_REFUND)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ description: 'Admin internal comment explaining the resolution decision' })
  @IsString()
  @MinLength(1)
  adminComment!: string;
}
