import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for lifting an active fraud suspension.
 */
export class LiftSuspensionDto {
  @ApiProperty({
    description: 'Comment explaining why the suspension is being lifted',
    minLength: 5,
    maxLength: 1000,
    example: 'User appealed — reviewed case manually, no further evidence of abuse.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  comment!: string;
}
