import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for cancelling a reservation.
 *
 * POST /ordering/reservations/:id/cancel
 */
export class CancelReservationDto {
  @ApiPropertyOptional({
    description: 'Optional reason for cancellation',
    example: 'Changed my mind',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
