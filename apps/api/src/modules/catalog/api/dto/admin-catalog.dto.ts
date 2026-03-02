import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

// ---------------------------------------------------------------------------
// Category DTOs
// ---------------------------------------------------------------------------

export class CreateCategoryDto {
  @ApiProperty({ description: 'Unique slug for the category' })
  @IsString()
  @MinLength(1)
  slug!: string;

  @ApiProperty({ description: 'French name' })
  @IsString()
  @MinLength(1)
  namesFr!: string;

  @ApiPropertyOptional({ description: 'English name' })
  @IsOptional()
  @IsString()
  namesEn?: string;

  @ApiPropertyOptional({ description: 'Kreol name' })
  @IsOptional()
  @IsString()
  namesKr?: string;

  @ApiPropertyOptional({ description: 'Icon identifier or emoji' })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Unique slug for the category' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'French name' })
  @IsOptional()
  @IsString()
  namesFr?: string;

  @ApiPropertyOptional({ description: 'English name' })
  @IsOptional()
  @IsString()
  namesEn?: string;

  @ApiPropertyOptional({ description: 'Kreol name' })
  @IsOptional()
  @IsString()
  namesKr?: string;

  @ApiPropertyOptional({ description: 'Icon identifier or emoji' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Whether the category is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() namesFr!: string;
  @ApiPropertyOptional() namesEn?: string | null;
  @ApiPropertyOptional() namesKr?: string | null;
  @ApiPropertyOptional() icon?: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() basketCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ---------------------------------------------------------------------------
// Tag DTOs
// ---------------------------------------------------------------------------

export class CreateTagDto {
  @ApiProperty({ description: 'Unique slug for the tag' })
  @IsString()
  @MinLength(1)
  slug!: string;

  @ApiProperty({ description: 'French name' })
  @IsString()
  @MinLength(1)
  namesFr!: string;

  @ApiPropertyOptional({ description: 'English name' })
  @IsOptional()
  @IsString()
  namesEn?: string;

  @ApiPropertyOptional({ description: 'Kreol name' })
  @IsOptional()
  @IsString()
  namesKr?: string;

  @ApiPropertyOptional({ description: 'Icon identifier or emoji' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional({ description: 'Unique slug for the tag' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'French name' })
  @IsOptional()
  @IsString()
  namesFr?: string;

  @ApiPropertyOptional({ description: 'English name' })
  @IsOptional()
  @IsString()
  namesEn?: string;

  @ApiPropertyOptional({ description: 'Kreol name' })
  @IsOptional()
  @IsString()
  namesKr?: string;

  @ApiPropertyOptional({ description: 'Icon identifier or emoji' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the tag is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TagResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() namesFr!: string;
  @ApiPropertyOptional() namesEn?: string | null;
  @ApiPropertyOptional() namesKr?: string | null;
  @ApiPropertyOptional() icon?: string | null;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() basketCount!: number;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
