import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '@bienbon/shared-types';

export class AuthorizePaymentDto {
  @ApiProperty({
    description: 'The reservation ID to authorize payment for',
    format: 'uuid',
  })
  @IsUUID()
  reservationId!: string;

  @ApiProperty({
    description: 'Amount in MUR (Mauritius Rupee)',
    example: 199.00,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    description: 'ISO 4217 currency code',
    default: 'MUR',
    example: 'MUR',
  })
  @IsString()
  @IsNotEmpty()
  currency!: string;

  @ApiProperty({
    description: 'Payment method to use',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({
    description: 'Tokenized payment method reference from Peach Payments JS widget',
    example: 'tok_test_abc123',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodToken!: string;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate charges',
    example: 'reservation-uuid-attempt-1',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
