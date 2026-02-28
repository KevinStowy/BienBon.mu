import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for cancelling a basket.
 */
export class CancelBasketDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
