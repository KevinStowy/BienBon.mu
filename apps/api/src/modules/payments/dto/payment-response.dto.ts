import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentMethod, PaymentType } from '@bienbon/shared-types';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment transaction ID', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Linked reservation ID', format: 'uuid' })
  reservationId!: string;

  @ApiProperty({ description: 'Transaction type', enum: PaymentType })
  type!: PaymentType;

  @ApiProperty({ description: 'Current status', enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Amount in MUR', example: 199.00 })
  amount!: number;

  @ApiProperty({ description: 'Currency code', example: 'MUR' })
  currency!: string;

  @ApiProperty({ description: 'Payment method used', enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Provider transaction ID (Peach)' })
  providerTxId?: string | null;

  @ApiPropertyOptional({ description: 'Commission amount in MUR' })
  commissionAmount?: number | null;

  @ApiPropertyOptional({ description: 'Partner net payout in MUR' })
  partnerNetAmount?: number | null;

  @ApiProperty({ description: 'Creation timestamp', type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp', type: String, format: 'date-time' })
  updatedAt!: string;
}

export class PartnerBalanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  partnerId!: string;

  @ApiProperty({ description: 'Available balance in MUR', example: 1250.00 })
  availableBalance!: number;

  @ApiProperty({ description: 'Pending balance in MUR (not yet paid out)', example: 350.00 })
  pendingBalance!: number;

  @ApiProperty({ description: 'Currency', example: 'MUR' })
  currency!: string;

  @ApiPropertyOptional({ description: 'Date of last payout', format: 'date-time' })
  lastPayoutDate!: string | null;

  @ApiPropertyOptional({ description: 'Amount of last payout in MUR' })
  lastPayoutAmount!: number | null;
}

export class AuthorizeResultDto {
  @ApiProperty({ description: 'Whether authorization succeeded' })
  success!: boolean;

  @ApiProperty({ description: 'Our internal transaction ID', format: 'uuid' })
  transactionId!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ description: 'Provider (Peach) transaction ID' })
  providerTxId?: string | null;

  @ApiPropertyOptional({ description: 'Error code if failed' })
  errorCode?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  errorMessage?: string;
}

export class CaptureResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Amount captured in MUR' })
  capturedAmount!: number;

  @ApiPropertyOptional()
  errorCode?: string;

  @ApiPropertyOptional()
  errorMessage?: string;
}

export class RefundResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ format: 'uuid' })
  transactionId!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Amount refunded in MUR' })
  refundedAmount!: number;

  @ApiPropertyOptional()
  errorCode?: string;

  @ApiPropertyOptional()
  errorMessage?: string;
}
