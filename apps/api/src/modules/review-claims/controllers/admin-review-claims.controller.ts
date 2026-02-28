// =============================================================================
// AdminReviewClaimsController — admin endpoints for claims and review moderation
// =============================================================================

import {
  Body,
  Controller,
  Delete,
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
import { ClaimStatus, Role } from '@bienbon/shared-types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { ClaimService } from '../application/services/claim.service';
import { ReviewService } from '../application/services/review.service';
import { ResolveClaimDto } from '../dto/resolve-claim.dto';
import { RejectClaimDto } from '../dto/reject-claim.dto';
import { ClaimResponseDto, PaginatedClaimsResponseDto } from '../dto/claim-response.dto';
import type { Claim } from '../domain/entities/claim.entity';

@ApiTags('Admin - Claims')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/claims')
export class AdminReviewClaimsController {
  constructor(
    private readonly claimService: ClaimService,
    private readonly reviewService: ReviewService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all claims',
    description: 'Returns a paginated list of all claims with optional status filter.',
  })
  @ApiQuery({
    name: 'status',
    enum: ClaimStatus,
    enumName: 'ClaimStatus',
    required: false,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Claims returned',
    type: PaginatedClaimsResponseDto,
  })
  async listClaims(
    @Query('status') status?: ClaimStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedClaimsResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    const { data, total } = await this.claimService.listAll({
      status,
      page: pageNum,
      limit: limitNum,
    });

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
  @ApiOperation({
    summary: 'Get claim by ID (admin)',
    description: 'Returns full claim details including admin fields.',
  })
  @ApiParam({ name: 'id', description: 'Claim ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Claim found',
    type: ClaimResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Claim not found' })
  async getClaim(@Param('id') id: string): Promise<ClaimResponseDto> {
    const claim = await this.claimService.findById(id);
    return this.mapToResponse(claim);
  }

  @Post(':id/take-charge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Take charge of a claim',
    description:
      'Admin takes charge of an OPEN claim, moving it to IN_REVIEW and assigning themselves.',
  })
  @ApiParam({ name: 'id', description: 'Claim ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Claim taken charge',
    type: ClaimResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid state transition' })
  async takeCharge(
    @Param('id') id: string,
    @CurrentUser() admin: AuthUser,
  ): Promise<ClaimResponseDto> {
    const claim = await this.claimService.takeCharge(id, admin.id);
    return this.mapToResponse(claim);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve a claim',
    description:
      'Admin resolves an IN_REVIEW claim with a full or partial refund. Triggers payment refund.',
  })
  @ApiParam({ name: 'id', description: 'Claim ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Claim resolved',
    type: ClaimResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid state transition or missing amount' })
  async resolveClaim(
    @Param('id') id: string,
    @Body() dto: ResolveClaimDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<ClaimResponseDto> {
    const claim = await this.claimService.resolve(id, admin.id, {
      type: dto.resolutionType,
      amount: dto.amount,
      comment: dto.adminComment,
    });
    return this.mapToResponse(claim);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a claim',
    description: 'Admin rejects an IN_REVIEW claim with a mandatory reason.',
  })
  @ApiParam({ name: 'id', description: 'Claim ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Claim rejected',
    type: ClaimResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Missing reason or invalid state transition' })
  async rejectClaim(
    @Param('id') id: string,
    @Body() dto: RejectClaimDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<ClaimResponseDto> {
    const claim = await this.claimService.reject(id, admin.id, dto.reason);
    return this.mapToResponse(claim);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a review (admin moderation)',
    description:
      'Admin deletes an inappropriate review. Recalculates the store rating and review count.',
  })
  @ApiParam({ name: 'id', description: 'Review ID (UUID)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Review deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  async deleteReview(@Param('id') id: string): Promise<void> {
    await this.reviewService.adminDeleteReview(id);
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
