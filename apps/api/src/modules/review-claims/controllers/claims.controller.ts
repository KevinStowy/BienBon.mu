// =============================================================================
// ClaimsController — consumer-facing claim endpoints
// =============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { ClaimService } from '../application/services/claim.service';
import { OpenClaimDto } from '../dto/open-claim.dto';
import { ClaimResponseDto, PaginatedClaimsResponseDto } from '../dto/claim-response.dto';
import type { Claim } from '../domain/entities/claim.entity';

@ApiTags('Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimService: ClaimService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.CONSUMER)
  @ApiOperation({
    summary: 'Open a claim',
    description:
      'File a claim for a picked-up reservation. Only allowed within 24 hours of pickup.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Claim opened successfully',
    type: ClaimResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation error or window expired' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Claim already exists for this reservation' })
  async openClaim(
    @Body() dto: OpenClaimDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ClaimResponseDto> {
    const claim = await this.claimService.openClaim({
      reservationId: dto.reservationId,
      consumerId: user.id,
      reasonSlug: dto.reasonSlug,
      description: dto.description,
      photoUrls: dto.photoUrls,
    });

    return this.mapToResponse(claim);
  }

  @Get('my')
  @Roles(Role.CONSUMER)
  @ApiOperation({
    summary: 'List my claims',
    description: 'Returns a paginated list of claims filed by the current consumer.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Claims returned',
    type: PaginatedClaimsResponseDto,
  })
  async listMyClaims(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedClaimsResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    const { data, total } = await this.claimService.listMyClaims(user.id, pageNum, limitNum);

    return {
      data: data.map((c) => this.mapToResponse(c)),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id')
  @Roles(Role.CONSUMER)
  @ApiOperation({
    summary: 'Get claim by ID',
    description: 'Returns a specific claim. Consumer can only view their own claims.',
  })
  @ApiParam({ name: 'id', description: 'Claim ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Claim found',
    type: ClaimResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Claim not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  async getClaim(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ClaimResponseDto> {
    const claim = await this.claimService.findClaimForConsumer(id, user.id);
    return this.mapToResponse(claim);
  }

  private mapToResponse(claim: Claim): ClaimResponseDto {
    return {
      id: claim.id,
      reservationId: claim.reservationId,
      consumerId: claim.consumerId,
      reasonSlug: claim.reasonSlug,
      description: claim.description,
      status: claim.status,
      assignedAdminId: claim.assignedAdminId,
      resolutionType: claim.resolutionType,
      resolutionAmount: claim.resolutionAmount,
      adminComment: claim.adminComment,
      resolvedBy: claim.resolvedBy,
      resolvedAt: claim.resolvedAt?.toISOString() ?? null,
      photos: claim.photos.map((p) => ({
        id: p.id,
        url: p.url,
        position: p.position,
      })),
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
    };
  }
}
