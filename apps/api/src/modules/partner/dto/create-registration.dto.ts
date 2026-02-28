// =============================================================================
// Create Registration DTO — 4-step onboarding form data
// =============================================================================

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationChannel } from '@bienbon/shared-types';

export class BusinessDataDto {
  @ApiProperty({ description: 'Legal business name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  businessName!: string;

  @ApiProperty({ description: 'Business Registration Number (BRN)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  brn!: string;

  @ApiProperty({ description: 'Business address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address!: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiProperty({ description: 'Business phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ description: 'Business email' })
  @IsEmail()
  businessEmail!: string;

  @ApiPropertyOptional({ description: 'Food licence number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  foodLicence?: string;

  @ApiPropertyOptional({ description: 'Brief description of the business' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CreateRegistrationDto {
  @ApiProperty({ type: BusinessDataDto, description: 'Business information' })
  businessData!: BusinessDataDto;

  @ApiProperty({
    description: 'Document URLs (e.g., BRN certificate, food licence)',
    example: { brnCertificate: 'https://...', foodLicence: 'https://...' },
  })
  documentUrls!: Record<string, string>;

  @ApiPropertyOptional({
    enum: RegistrationChannel,
    enumName: 'RegistrationChannel',
    description: 'How the partner registered',
    default: RegistrationChannel.WEB_FORM,
  })
  @IsOptional()
  @IsEnum(RegistrationChannel)
  registrationChannel?: RegistrationChannel;
}

export class RejectRegistrationDto {
  @ApiProperty({
    description: 'List of rejection reasons',
    example: ['MISSING_FOOD_LICENCE', 'INVALID_BRN'],
    type: [String],
  })
  @IsString({ each: true })
  reasons!: string[];

  @ApiPropertyOptional({ description: 'Admin comment visible to the partner' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class SuspendPartnerDto {
  @ApiProperty({ description: 'Reason for suspension' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

export class BanPartnerDto {
  @ApiProperty({ description: 'Reason for ban' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({ description: 'Double confirmation required for ban', example: true })
  confirmed!: boolean;
}

export class DocumentUrlDto {
  @ApiProperty({ description: 'Document type key' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ description: 'Document URL' })
  @IsUrl()
  url!: string;
}
