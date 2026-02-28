// =============================================================================
// ReviewsController — consumer-facing review endpoints
// =============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { Public } from '../../auth/decorators/public.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { ReviewService } from '../application/services/review.service';
import { CreateReviewDto, UpdateReviewDto } from '../dto/create-review.dto';
import { PaginatedReviewsResponseDto, ReviewResponseDto } from '../dto/review-response.dto';
import type { Review } from '../domain/entities/review.entity';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.CONSUMER)
  @ApiOperation({
    summary: 'Create a review',
    description:
      'Submit a review for a picked-up reservation. Only allowed within 24 hours of pickup.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Review created',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation error or window expired' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Review already exists for this reservation' })
  async createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewService.createReview({
      reservationId: dto.reservationId,
      consumerId: user.id,
      rating: dto.rating,
      comment: dto.comment,
    });

    return this.mapToResponse(review);
  }

  @Patch(':id')
  @Roles(Role.CONSUMER)
  @ApiOperation({
    summary: 'Update a review',
    description:
      'Update your own review. Only allowed within the 24-hour editable window.',
  })
  @ApiParam({ name: 'id', description: 'Review ID (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Review updated',
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Review not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not your review or window expired' })
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewService.updateReview(id, user.id, {
      rating: dto.rating,
      comment: dto.comment,
    });

    return this.mapToResponse(review);
  }

  @Get('stores/:storeId')
  @Public()
  @ApiOperation({
    summary: 'List store reviews',
    description: 'Returns a paginated list of reviews for a specific store. Public endpoint.',
  })
  @ApiParam({ name: 'storeId', description: 'Store ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reviews returned',
    type: PaginatedReviewsResponseDto,
  })
  async listStoreReviews(
    @Param('storeId') storeId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedReviewsResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;

    const { data, total } = await this.reviewService.listStoreReviews(storeId, pageNum, limitNum);

    return {
      data: data.map((r) => this.mapToResponse(r)),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  private mapToResponse(review: Review): ReviewResponseDto {
    return {
      id: review.id,
      reservationId: review.reservationId,
      consumerId: review.consumerId,
      partnerId: review.partnerId,
      rating: review.rating,
      comment: review.comment,
      editableUntil: review.editableUntil.toISOString(),
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }
}
