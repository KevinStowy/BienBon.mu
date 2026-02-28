// =============================================================================
// Partner Controller — partner-facing endpoints
// =============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PartnerService } from '../services/partner.service';
import { PartnerRegistrationService } from '../services/partner-registration.service';
import { CreateRegistrationDto } from '../dto/create-registration.dto';

@ApiTags('Partner')
@ApiBearerAuth()
@Controller('partner')
export class PartnerController {
  constructor(
    private readonly partnerService: PartnerService,
    private readonly registrationService: PartnerRegistrationService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration (public endpoint — no auth required)
  // ---------------------------------------------------------------------------

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit partner registration',
    description: 'Submit a 4-step registration form to become a partner. No authentication required.',
  })
  @ApiResponse({ status: 201, description: 'Registration submitted successfully' })
  @ApiResponse({ status: 409, description: 'Registration already pending' })
  async register(
    @Body() dto: CreateRegistrationDto,
    @CurrentUser() user?: AuthUser,
  ) {
    // If authenticated, use the user ID; otherwise require userId in body
    if (!user?.id) {
      return { message: 'User authentication required to submit registration', error: true };
    }
    return this.registrationService.submitRegistration(user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // Partner profile
  // ---------------------------------------------------------------------------

  @Get('profile')
  @Roles(Role.PARTNER)
  @ApiOperation({
    summary: 'Get own partner profile',
    description: 'Returns the authenticated partner profile.',
  })
  @ApiResponse({ status: 200, description: 'Partner profile returned' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async getProfile(@CurrentUser() user: AuthUser) {
    const partner = await this.partnerService.findByUserId(user.id);

    if (!partner) {
      throw new NotFoundException('Partner profile not found');
    }

    return partner;
  }

  // ---------------------------------------------------------------------------
  // Registration requests
  // ---------------------------------------------------------------------------

  @Get('registration-requests/current')
  @Roles(Role.PARTNER)
  @ApiOperation({
    summary: 'Get current registration request',
    description: 'Returns the most recent registration request for the authenticated partner.',
  })
  @ApiResponse({ status: 200, description: 'Registration request returned' })
  @ApiResponse({ status: 404, description: 'No registration request found' })
  async getCurrentRequest(@CurrentUser() user: AuthUser) {
    const request = await this.registrationService.getCurrentRequest(user.id);

    if (!request) {
      throw new NotFoundException('No registration request found');
    }

    return request;
  }

  @Post('registration-requests/:requestId/cancel')
  @Roles(Role.PARTNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel pending registration request',
    description: 'Partner can cancel their own registration request while it is still PENDING.',
  })
  @ApiParam({ name: 'requestId', description: 'Registration request ID' })
  @ApiResponse({ status: 200, description: 'Registration request cancelled' })
  @ApiResponse({ status: 400, description: 'Request is not in a cancellable state' })
  @ApiResponse({ status: 404, description: 'Registration request not found' })
  async cancelRequest(
    @Param('requestId') requestId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.registrationService.cancelRequest(requestId, user.id);
  }
}
