import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

/**
 * DTO for applying a referral code.
 */
export class CreateReferralDto {
  @ApiProperty({
    description: 'The referral code to apply',
    example: 'ABC12345',
    minLength: 4,
    maxLength: 20,
  })
  @IsString()
  @Length(4, 20)
  code!: string;
}
