import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ConsumerProfileService } from './consumer-profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConsumerProfileResponseDto } from './dto/profile-response.dto';

/**
 * Consumer profile endpoints.
 *
 * All routes require CONSUMER, ADMIN, or SUPER_ADMIN role.
 */
@ApiTags('consumer')
@ApiBearerAuth()
@Controller('consumer/profile')
export class ConsumerProfileController {
  constructor(private readonly profileService: ConsumerProfileService) {}

  // ---------------------------------------------------------------------------
  // GET /consumer/profile — Get own profile (auto-creates if missing)
  // ---------------------------------------------------------------------------
  @Get()
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get own consumer profile',
    description: 'Returns the authenticated consumer profile. Auto-creates the profile if it does not exist yet.',
  })
  @ApiResponse({ status: 200, description: 'Consumer profile', type: ConsumerProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async getProfile(@CurrentUser() user: AuthUser): Promise<ConsumerProfileResponseDto> {
    return this.profileService.getOrCreateProfile(user.id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /consumer/profile — Update own profile
  // ---------------------------------------------------------------------------
  @Patch()
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update consumer profile',
    description: 'Updates dietary preferences and/or notification preferences for the authenticated consumer.',
  })
  @ApiResponse({ status: 200, description: 'Updated consumer profile', type: ConsumerProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Consumer profile not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ConsumerProfileResponseDto> {
    return this.profileService.updateProfile(user.id, dto);
  }
}
