// =============================================================================
// AdminConsumerController — admin endpoints for consumer management
// =============================================================================

import {
  Body,
  Controller,
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
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { AdminConsumerService } from './admin-consumer.service';
import {
  ListConsumersQueryDto,
  SuspendConsumerDto,
  ReactivateConsumerDto,
  BanConsumerDto,
  PaginatedConsumersResponseDto,
  ConsumerDetailDto,
} from './dto/admin-consumer.dto';

@ApiTags('Admin - Consumers')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/v1/admin/consumers')
export class AdminConsumerController {
  constructor(private readonly adminConsumerService: AdminConsumerService) {}

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/consumers — List consumers (paginated)
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'List all consumers',
    description: 'Returns a paginated list of consumers with optional search, status filter, and sorting.',
  })
  @ApiResponse({ status: 200, description: 'Consumers returned', type: PaginatedConsumersResponseDto })
  async listConsumers(
    @Query() query: ListConsumersQueryDto,
  ): Promise<PaginatedConsumersResponseDto> {
    return this.adminConsumerService.listConsumers(query);
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/consumers/:id — Consumer detail
  // ---------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({
    summary: 'Get consumer details',
    description: 'Returns full consumer profile with aggregated statistics.',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Consumer detail returned', type: ConsumerDetailDto })
  @ApiResponse({ status: 404, description: 'Consumer not found' })
  async getConsumer(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConsumerDetailDto> {
    return this.adminConsumerService.getConsumerDetail(id);
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/admin/consumers/:id/suspend
  // ---------------------------------------------------------------------------

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend a consumer',
    description: 'Suspends an ACTIVE consumer account. Requires a reason.',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Consumer suspended' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Consumer not found' })
  async suspendConsumer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendConsumerDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<{ success: boolean }> {
    return this.adminConsumerService.suspendConsumer(id, dto.reason, admin);
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/admin/consumers/:id/reactivate
  // ---------------------------------------------------------------------------

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reactivate a suspended consumer',
    description: 'Reactivates a SUSPENDED consumer back to ACTIVE.',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Consumer reactivated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Consumer not found' })
  async reactivateConsumer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReactivateConsumerDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<{ success: boolean }> {
    return this.adminConsumerService.reactivateConsumer(id, admin, dto.comment);
  }

  // ---------------------------------------------------------------------------
  // POST /api/v1/admin/consumers/:id/ban — SUPER_ADMIN only
  // ---------------------------------------------------------------------------

  @Post(':id/ban')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Ban a consumer (SUPER_ADMIN only)',
    description: 'Permanently bans a consumer. Requires reason and explicit confirmation.',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Consumer banned' })
  @ApiResponse({ status: 400, description: 'Missing confirmation or invalid transition' })
  @ApiResponse({ status: 404, description: 'Consumer not found' })
  async banConsumer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanConsumerDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<{ success: boolean }> {
    return this.adminConsumerService.banConsumer(id, dto.reason, dto.confirmed ?? false, admin);
  }
}
