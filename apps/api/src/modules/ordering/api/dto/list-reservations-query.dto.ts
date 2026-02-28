import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/dto/pagination.dto';
import { ReservationStatus } from '../../domain/enums/reservation-status.enum';

/**
 * Query parameters for listing reservations.
 * Extends the shared pagination DTO.
 *
 * GET /ordering/reservations
 * GET /ordering/store/:storeId/reservations
 */
export class ListReservationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by reservation status',
    enum: ReservationStatus,
    example: ReservationStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
