import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Reservation } from '../../domain/entities/reservation.entity';
import type { ReservationStatus } from '../../domain/enums/reservation-status.enum';

/**
 * Response DTO for a single reservation.
 * Converts domain entity to a serializable API response.
 */
export class ReservationResponseDto {
  @ApiProperty({ description: 'Reservation UUID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ description: 'Basket UUID', example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  basketId!: string;

  @ApiProperty({ description: 'Consumer UUID', example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  consumerId!: string;

  @ApiProperty({ description: 'Number of baskets reserved', example: 1 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price at time of reservation (MUR)', example: 150.00 })
  unitPrice!: number;

  @ApiProperty({ description: 'Total price (unitPrice × quantity)', example: 150.00 })
  totalPrice!: number;

  @ApiProperty({
    description: 'Current reservation status',
    enum: [
      'PENDING_PAYMENT',
      'CONFIRMED',
      'READY',
      'PICKED_UP',
      'NO_SHOW',
      'CANCELLED_CONSUMER',
      'CANCELLED_PARTNER',
      'EXPIRED',
    ],
    example: 'PENDING_PAYMENT',
  })
  status!: ReservationStatus;

  @ApiProperty({
    description: 'QR code token for pickup validation',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  qrCode!: string;

  @ApiProperty({
    description: '6-digit PIN code for pickup validation',
    example: '042837',
  })
  pinCode!: string;

  @ApiPropertyOptional({
    description: 'Reservation expiry datetime (5 min after creation)',
    example: '2025-01-15T10:05:00.000Z',
  })
  expiresAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When the reservation was confirmed (payment received)',
    example: '2025-01-15T10:02:00.000Z',
  })
  confirmedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When the basket was marked ready for pickup',
    example: '2025-01-15T12:00:00.000Z',
  })
  readyAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When the basket was picked up',
    example: '2025-01-15T12:30:00.000Z',
  })
  pickedUpAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When the reservation was cancelled',
    example: '2025-01-15T11:00:00.000Z',
  })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When the no-show was recorded',
    example: '2025-01-15T13:05:00.000Z',
  })
  noShowAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When the reservation expired',
    example: '2025-01-15T10:05:00.000Z',
  })
  expiredAt?: Date | null;

  @ApiProperty({ description: 'Creation timestamp', example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2025-01-15T10:02:00.000Z' })
  updatedAt!: Date;

  /**
   * Factory method to convert a domain Reservation entity to a response DTO.
   */
  static fromEntity(reservation: Reservation): ReservationResponseDto {
    const dto = new ReservationResponseDto();
    dto.id = reservation.id;
    dto.basketId = reservation.basketId;
    dto.consumerId = reservation.consumerId;
    dto.quantity = reservation.quantity;
    dto.unitPrice = reservation.unitPrice;
    dto.totalPrice = reservation.totalPrice;
    dto.status = reservation.status;
    dto.qrCode = reservation.qrCode;
    dto.pinCode = reservation.pinCode;
    dto.expiresAt = reservation.expiresAt ?? null;
    dto.confirmedAt = reservation.confirmedAt ?? null;
    dto.readyAt = reservation.readyAt ?? null;
    dto.pickedUpAt = reservation.pickedUpAt ?? null;
    dto.cancelledAt = reservation.cancelledAt ?? null;
    dto.noShowAt = reservation.noShowAt ?? null;
    dto.expiredAt = reservation.expiredAt ?? null;
    dto.createdAt = reservation.createdAt;
    dto.updatedAt = reservation.updatedAt;
    return dto;
  }
}
