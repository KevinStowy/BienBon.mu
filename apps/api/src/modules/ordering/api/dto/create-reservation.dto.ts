import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new reservation.
 *
 * POST /ordering/reservations
 */
export class CreateReservationDto {
  @ApiProperty({
    description: 'UUID of the basket to reserve',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  basketId!: string;

  @ApiPropertyOptional({
    description: 'Number of baskets to reserve (1 by default)',
    example: 1,
    minimum: 1,
    maximum: 10,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  quantity: number = 1;
}
