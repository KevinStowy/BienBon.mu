import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for decrementing basket stock.
 * Used by the Ordering BC internally.
 */
export class DecrementStockDto {
  @ApiProperty({ description: 'Quantity to decrement', minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;
}
