import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { FraudAlertService } from './fraud-alert.service';
import { ResolveAlertDto } from './dto/resolve-alert.dto';
import { FraudAlertResponseDto } from './dto/fraud-alert-response.dto';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

/**
 * Controller for managing fraud alerts.
 * All endpoints require ADMIN or SUPER_ADMIN role.
 */
@ApiTags('fraud')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('fraud/alerts')
export class FraudAlertController {
  constructor(private readonly fraudAlertService: FraudAlertService) {}

  // ---------------------------------------------------------------------------
  // GET /fraud/alerts — List alerts
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({
    summary: 'List fraud alerts',
    description: 'Returns a paginated list of fraud alerts, filterable by status, severity, actorType, and actorId.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of fraud alerts', type: PaginatedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async listAlerts(
    @Query() query: ListAlertsQueryDto,
  ): Promise<PaginatedResponseDto<FraudAlertResponseDto>> {
    return this.fraudAlertService.listAlerts(query);
  }

  // ---------------------------------------------------------------------------
  // GET /fraud/alerts/:id — Get alert details
  // ---------------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({
    summary: 'Get fraud alert details',
    description: 'Returns the details of a single fraud alert by ID.',
  })
  @ApiParam({ name: 'id', description: 'Fraud alert UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud alert details', type: FraudAlertResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud alert not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async getAlert(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FraudAlertResponseDto> {
    return this.fraudAlertService.getAlert(id);
  }

  // ---------------------------------------------------------------------------
  // POST /fraud/alerts/:id/investigate — Mark as INVESTIGATED
  // ---------------------------------------------------------------------------
  @Post(':id/investigate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a fraud alert as investigated',
    description: 'Transitions a NEW fraud alert to INVESTIGATED status, indicating an admin has reviewed it.',
  })
  @ApiParam({ name: 'id', description: 'Fraud alert UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud alert marked as investigated', type: FraudAlertResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud alert not found' })
  @ApiBadRequestResponse({ description: 'Alert is not in NEW status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async investigate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FraudAlertResponseDto> {
    return this.fraudAlertService.investigate(id);
  }

  // ---------------------------------------------------------------------------
  // POST /fraud/alerts/:id/resolve — Resolve alert
  // ---------------------------------------------------------------------------
  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve a fraud alert',
    description: 'Resolves a fraud alert as RESOLVED or FALSE_POSITIVE. Requires an admin comment.',
  })
  @ApiParam({ name: 'id', description: 'Fraud alert UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud alert resolved', type: FraudAlertResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud alert not found' })
  @ApiBadRequestResponse({ description: 'Alert is already in a terminal status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<FraudAlertResponseDto> {
    return this.fraudAlertService.resolve(id, dto, currentUser.id);
  }
}
