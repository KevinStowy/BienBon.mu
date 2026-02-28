// =============================================================================
// Partner Admin Controller — admin endpoints for partner management
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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PartnerStatus, Role } from '@bienbon/shared-types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PartnerService } from '../services/partner.service';
import {
  BanPartnerDto,
  RejectRegistrationDto,
  SuspendPartnerDto,
} from '../dto/create-registration.dto';

@ApiTags('Admin - Partners')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin/partners')
export class PartnerAdminController {
  constructor(
    private readonly partnerService: PartnerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all partners',
    description: 'Returns paginated list of all partners with optional status filter.',
  })
  @ApiQuery({ name: 'status', enum: PartnerStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Partners returned' })
  async listPartners(
    @Query('status') status?: PartnerStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.partnerService.listAll({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':partnerId')
  @ApiOperation({
    summary: 'Get partner details',
    description: 'Returns full partner profile with stores.',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner profile ID' })
  @ApiResponse({ status: 200, description: 'Partner details returned' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  async getPartner(@Param('partnerId') partnerId: string) {
    return this.partnerService.findById(partnerId);
  }

  @Post(':partnerId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve partner registration',
    description: 'Validates a PENDING or REJECTED partner, setting status to ACTIVE.',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner profile ID' })
  @ApiResponse({ status: 200, description: 'Partner approved' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async approvePartner(
    @Param('partnerId') partnerId: string,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.partnerService.approve(partnerId, admin.id);
  }

  @Post(':partnerId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject partner registration',
    description: 'Rejects a PENDING partner with rejection reasons.',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner profile ID' })
  @ApiResponse({ status: 200, description: 'Partner rejected' })
  @ApiResponse({ status: 400, description: 'Missing rejection reason or invalid transition' })
  async rejectPartner(
    @Param('partnerId') partnerId: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.partnerService.reject(partnerId, admin.id, dto);
  }

  @Post(':partnerId/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend active partner',
    description: 'Suspends an ACTIVE partner. Reason is mandatory.',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner profile ID' })
  @ApiResponse({ status: 200, description: 'Partner suspended' })
  @ApiResponse({ status: 400, description: 'Missing reason or invalid transition' })
  async suspendPartner(
    @Param('partnerId') partnerId: string,
    @Body() dto: SuspendPartnerDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.partnerService.suspend(partnerId, admin.id, dto);
  }

  @Post(':partnerId/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reactivate suspended partner',
    description: 'Reactivates a SUSPENDED partner back to ACTIVE.',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner profile ID' })
  @ApiResponse({ status: 200, description: 'Partner reactivated' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  async reactivatePartner(
    @Param('partnerId') partnerId: string,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.partnerService.reactivate(partnerId, admin.id);
  }

  @Post(':partnerId/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ban a partner',
    description:
      'Permanently bans a partner. Requires reason and double confirmation (confirmed: true).',
  })
  @ApiParam({ name: 'partnerId', description: 'Partner profile ID' })
  @ApiResponse({ status: 200, description: 'Partner banned' })
  @ApiResponse({ status: 400, description: 'Missing confirmation or reason, or invalid transition' })
  async banPartner(
    @Param('partnerId') partnerId: string,
    @Body() dto: BanPartnerDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.partnerService.ban(partnerId, admin.id, dto);
  }
}
