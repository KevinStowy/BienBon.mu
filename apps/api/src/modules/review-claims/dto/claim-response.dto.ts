import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClaimStatus, ResolutionType } from '@bienbon/shared-types';

export class ClaimPhotoResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  position!: number;
}

export class ClaimResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  reservationId!: string;

  @ApiProperty()
  consumerId!: string;

  @ApiProperty()
  reasonSlug!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ClaimStatus, enumName: 'ClaimStatus' })
  status!: ClaimStatus;

  @ApiPropertyOptional({ nullable: true })
  assignedAdminId!: string | null;

  @ApiPropertyOptional({ enum: ResolutionType, enumName: 'ResolutionType', nullable: true })
  resolutionType!: ResolutionType | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  resolutionAmount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  adminComment!: string | null;

  @ApiPropertyOptional({ nullable: true })
  resolvedBy!: string | null;

  @ApiPropertyOptional({ nullable: true })
  resolvedAt!: string | null;

  @ApiProperty({ type: [ClaimPhotoResponseDto] })
  photos!: ClaimPhotoResponseDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedClaimsResponseDto {
  @ApiProperty({ type: [ClaimResponseDto] })
  data!: ClaimResponseDto[];

  @ApiProperty()
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
