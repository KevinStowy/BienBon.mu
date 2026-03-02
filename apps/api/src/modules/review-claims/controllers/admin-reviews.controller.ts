// =============================================================================
// AdminReviewsController — admin endpoints for review moderation
// =============================================================================
// Route: /api/v1/admin/reviews
// Separate from ClaimsController because the frontend uses a different base path.

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReviewService } from '../application/services/review.service';

@ApiTags('Admin - Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/v1/admin/reviews')
export class AdminReviewsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewService: ReviewService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all reviews for admin moderation' })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Reviews returned' })
  async listReviews(
    @Query('partnerId') partnerId?: string,
    @Query('rating') rating?: string,
    @Query('search') search?: string,
  ): Promise<{ data: unknown[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (partnerId) where['partnerId'] = partnerId;
    if (rating) where['rating'] = parseInt(rating, 10);

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          consumer: { select: { firstName: true, lastName: true } },
          partner: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    const data = reviews
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const consumerName = `${r.consumer.firstName} ${r.consumer.lastName}`.toLowerCase();
        const partnerName = `${r.partner.firstName} ${r.partner.lastName}`.toLowerCase();
        return consumerName.includes(q) || partnerName.includes(q) || (r.comment?.toLowerCase().includes(q) ?? false);
      })
      .map((r) => ({
        id: r.id,
        consumerId: r.consumerId,
        consumerName: `${r.consumer.firstName} ${r.consumer.lastName}`,
        partnerId: r.partnerId,
        partnerName: `${r.partner.firstName} ${r.partner.lastName}`,
        rating: r.rating,
        createdAt: r.createdAt.toISOString(),
        flagged: r.rating <= 2,
        flagReason: r.rating <= 2 ? 'Low rating' : null,
      }));

    return { data, total };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review (admin moderation)' })
  @ApiResponse({ status: 204, description: 'Review deleted' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.reviewService.adminDeleteReview(id);
  }
}
