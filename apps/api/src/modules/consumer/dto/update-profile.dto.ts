import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO for updating a consumer profile.
 * All fields are optional — only provided fields are updated.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'List of dietary preference slugs (e.g. vegan, gluten-free)',
    type: [String],
    example: ['vegan', 'gluten-free'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietaryPreferences?: string[];

  @ApiPropertyOptional({
    description: 'Notification preferences as a JSON object',
    example: { pushEnabled: true, emailEnabled: false },
  })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, unknown>;
}
