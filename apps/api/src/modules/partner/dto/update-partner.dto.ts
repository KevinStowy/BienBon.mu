import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePartnerDto {
  @ApiPropertyOptional({ description: 'Status reason (admin use)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  statusReason?: string;
}
