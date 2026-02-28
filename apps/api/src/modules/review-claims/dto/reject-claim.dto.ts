import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectClaimDto {
  @ApiProperty({ description: 'Reason for rejecting the claim' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
