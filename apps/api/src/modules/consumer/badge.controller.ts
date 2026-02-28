import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { BadgeService } from './badge.service';
import { BadgeResponseDto } from './dto/badge-response.dto';

/**
 * Badge endpoints.
 *
 * GET /consumer/badges — public endpoint (no auth required).
 * GET /consumer/badges/earned — requires CONSUMER, ADMIN, or SUPER_ADMIN role.
 */
@ApiTags('consumer')
@Controller('consumer/badges')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  // ---------------------------------------------------------------------------
  // GET /consumer/badges — List all badges (PUBLIC — shows earned status if authed)
  // ---------------------------------------------------------------------------
  @Get()
  @Public()
  @ApiOperation({
    summary: 'List all badges',
    description:
      'Returns all available badges. If the user is authenticated as CONSUMER, ' +
      'the earned flag and earnedAt timestamp are populated for each badge.',
  })
  @ApiResponse({ status: 200, description: 'List of all badges', type: [BadgeResponseDto] })
  async listAllBadges(@CurrentUser() user: AuthUser | null | undefined): Promise<BadgeResponseDto[]> {
    const userId = user?.id ?? null;
    return this.badgeService.listAllBadges(userId);
  }

  // ---------------------------------------------------------------------------
  // GET /consumer/badges/earned — List only earned badges (CONSUMER only)
  // ---------------------------------------------------------------------------
  @Get('earned')
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List earned badges',
    description: 'Returns only the badges earned by the authenticated consumer.',
  })
  @ApiResponse({ status: 200, description: 'List of earned badges', type: [BadgeResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async listEarnedBadges(@CurrentUser() user: AuthUser): Promise<BadgeResponseDto[]> {
    return this.badgeService.listEarnedBadges(user.id);
  }
}
