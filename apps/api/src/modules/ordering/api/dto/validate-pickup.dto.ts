import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

/**
 * DTO for validating pickup via QR code or PIN code.
 * At least one of qrCode or pinCode must be provided.
 *
 * POST /ordering/reservations/:id/validate-pickup
 */
export class ValidatePickupDto {
  @ApiPropertyOptional({
    description: 'QR code UUID from the consumer app',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID()
  qrCode?: string;

  @ApiPropertyOptional({
    description: '6-digit PIN code displayed to the consumer',
    example: '042837',
    minLength: 6,
    maxLength: 6,
  })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  pinCode?: string;
}
