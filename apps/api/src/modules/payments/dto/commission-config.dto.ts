import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateCommissionConfigDto {
  @ApiProperty({
    description: 'Scope: "global" or "partner:<uuid>"',
    example: 'global',
  })
  @IsString()
  scope!: string;

  @ApiPropertyOptional({
    description: 'Partner UUID for partner-specific config',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({
    description: 'Basket type UUID for basket-type-specific config',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  basketTypeId?: string;

  @ApiProperty({
    description: 'Commission rate as decimal (e.g., 0.25 for 25%)',
    minimum: 0,
    maximum: 1,
    example: 0.25,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate!: number;

  @ApiProperty({
    description: 'Minimum commission fee in MUR',
    minimum: 0,
    example: 50,
  })
  @IsNumber()
  @Min(0)
  feeMinimum!: number;

  @ApiProperty({
    description: 'ISO 8601 date when this config becomes effective',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 date when this config expires (null = indefinite)',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @ApiPropertyOptional({
    description: 'Admin notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CommissionConfigResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  scope!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  partnerId!: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  basketTypeId!: string | null;

  @ApiProperty({ description: 'Commission rate as decimal', example: 0.25 })
  commissionRate!: number;

  @ApiProperty({ description: 'Minimum fee in MUR', example: 50 })
  feeMinimum!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  effectiveFrom!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  effectiveTo!: string | null;

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;
}
