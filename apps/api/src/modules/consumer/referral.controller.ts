import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
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
import { ReferralService } from './referral.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ReferralCodeResponseDto, ReferralResponseDto } from './dto/referral-response.dto';

/**
 * Referral endpoints for consumers.
 *
 * All routes require CONSUMER, ADMIN, or SUPER_ADMIN role.
 */
@ApiTags('consumer')
@ApiBearerAuth()
@Controller('consumer')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // ---------------------------------------------------------------------------
  // GET /consumer/referral-code — Get my referral code (auto-generates if missing)
  // ---------------------------------------------------------------------------
  @Get('referral-code')
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get my referral code',
    description:
      'Returns the authenticated consumer\'s referral code. ' +
      'If no code has been generated yet, a new 8-character code is created and saved.',
  })
  @ApiResponse({ status: 200, description: 'Referral code', type: ReferralCodeResponseDto })
  @ApiNotFoundResponse({ description: 'Consumer profile not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async getReferralCode(@CurrentUser() user: AuthUser): Promise<ReferralCodeResponseDto> {
    return this.referralService.getReferralCode(user.id);
  }

  // ---------------------------------------------------------------------------
  // POST /consumer/referrals/apply — Apply a referral code
  // ---------------------------------------------------------------------------
  @Post('referrals/apply')
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apply a referral code',
    description:
      'Applies a referral code for the authenticated consumer. ' +
      'The consumer must not be the owner of the code and must not have applied a code before.',
  })
  @ApiResponse({ status: 201, description: 'Referral created successfully', type: ReferralResponseDto })
  @ApiNotFoundResponse({ description: 'Referral code not found' })
  @ApiConflictResponse({ description: 'User has already applied a referral code' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async applyReferralCode(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReferralDto,
  ): Promise<ReferralResponseDto> {
    return this.referralService.applyReferralCode(user.id, dto.code);
  }
}
