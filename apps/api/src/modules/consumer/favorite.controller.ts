import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { FavoriteService } from './favorite.service';
import { FavoriteResponseDto } from './dto/favorite-response.dto';
import { PaginatedResponseDto, PaginationQueryDto } from '../../shared/dto/pagination.dto';

/**
 * Favorite store endpoints for consumers.
 *
 * All routes require CONSUMER, ADMIN, or SUPER_ADMIN role.
 */
@ApiTags('consumer')
@ApiBearerAuth()
@Controller('consumer/favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  // ---------------------------------------------------------------------------
  // GET /consumer/favorites — List my favorites (paginated)
  // ---------------------------------------------------------------------------
  @Get()
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List my favorite stores',
    description: 'Returns a paginated list of stores marked as favorites by the authenticated consumer.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of favorites', type: PaginatedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async listFavorites(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<FavoriteResponseDto>> {
    return this.favoriteService.listFavorites(user.id, pagination);
  }

  // ---------------------------------------------------------------------------
  // POST /consumer/favorites/:storeId — Add store to favorites (idempotent)
  // ---------------------------------------------------------------------------
  @Post(':storeId')
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add store to favorites',
    description: 'Marks a store as a favorite for the authenticated consumer. Idempotent — safe to call multiple times.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID to favorite', type: String })
  @ApiResponse({ status: 200, description: 'Favorite entry (existing or newly created)', type: FavoriteResponseDto })
  @ApiNotFoundResponse({ description: 'Store not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async addFavorite(
    @CurrentUser() user: AuthUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ): Promise<FavoriteResponseDto> {
    return this.favoriteService.addFavorite(user.id, storeId);
  }

  // ---------------------------------------------------------------------------
  // DELETE /consumer/favorites/:storeId — Remove store from favorites
  // ---------------------------------------------------------------------------
  @Delete(':storeId')
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove store from favorites',
    description: 'Removes a store from the authenticated consumer\'s favorites.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID to remove from favorites', type: String })
  @ApiResponse({ status: 204, description: 'Favorite removed successfully' })
  @ApiNotFoundResponse({ description: 'Store not in favorites' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async removeFavorite(
    @CurrentUser() user: AuthUser,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ): Promise<void> {
    return this.favoriteService.removeFavorite(user.id, storeId);
  }
}
