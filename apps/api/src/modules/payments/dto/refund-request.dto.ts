import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class RefundRequestDto {
  @ApiProperty({
    description: 'The captured transaction ID to refund',
    format: 'uuid',
  })
  @IsUUID()
  transactionId!: string;

  @ApiProperty({
    description: 'Amount to refund in MUR. Must not exceed the original captured amount.',
    example: 199.00,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'Human-readable reason for the refund',
    example: 'Claim resolved — full refund',
  })
  @IsString()
  reason!: string;
}
