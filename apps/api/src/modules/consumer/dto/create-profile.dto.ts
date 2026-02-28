import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO for creating/upsetting a consumer profile.
 * The profile is auto-created if missing, so this DTO is used
 * only for the optional initial payload on first access.
 */
export class CreateProfileDto {
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
