import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ---------------------------------------------------------------------------
// Query DTOs
// ---------------------------------------------------------------------------

export class ListConsumersQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'BANNED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'] as const)
  sortOrder: 'asc' | 'desc' = 'desc';
}

// ---------------------------------------------------------------------------
// Action DTOs
// ---------------------------------------------------------------------------

export class SuspendConsumerDto {
  @ApiProperty({ description: 'Reason for suspension' })
  @IsString()
  reason!: string;
}

export class ReactivateConsumerDto {
  @ApiPropertyOptional({ description: 'Optional comment for reactivation' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class BanConsumerDto {
  @ApiProperty({ description: 'Reason for banning the consumer' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Confirmation flag (required for ban)' })
  @IsOptional()
  confirmed?: boolean;
}

// ---------------------------------------------------------------------------
// Response DTOs
// ---------------------------------------------------------------------------

export class ConsumerListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
}

export class PaginatedConsumersResponseDto {
  @ApiProperty({ type: [ConsumerListItemDto] }) data!: ConsumerListItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

export class ConsumerStatsDto {
  @ApiProperty() totalReservations!: number;
  @ApiProperty() totalNoShows!: number;
  @ApiProperty() totalSpent!: number;
  @ApiProperty() totalClaims!: number;
}

export class ConsumerDetailDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ nullable: true }) dietaryPreferences!: string[] | null;
  @ApiProperty({ nullable: true }) referralCode!: string | null;
  @ApiProperty() stats!: ConsumerStatsDto;
}
