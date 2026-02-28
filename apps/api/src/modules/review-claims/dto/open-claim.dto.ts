import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenClaimDto {
  @ApiProperty({ description: 'ID of the reservation to file a claim against' })
  @IsUUID()
  reservationId!: string;

  @ApiProperty({ description: 'Slug of the predefined claim reason (e.g. "wrong-product")' })
  @IsString()
  @MinLength(1)
  reasonSlug!: string;

  @ApiProperty({
    description: 'Detailed description of the issue (min 20 characters)',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  description!: string;

  @ApiPropertyOptional({
    description: 'Up to 5 photo URLs as evidence',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(5)
  photoUrls?: string[];
}
