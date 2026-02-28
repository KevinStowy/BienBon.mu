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
import { FraudSuspensionService } from './fraud-suspension.service';
import { LiftSuspensionDto } from './dto/lift-suspension.dto';
import { FraudSuspensionResponseDto } from './dto/fraud-suspension-response.dto';
import { ListSuspensionsQueryDto } from './dto/list-suspensions-query.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

/**
 * Controller for managing fraud suspensions.
 * All endpoints require ADMIN or SUPER_ADMIN role.
 */
@ApiTags('fraud')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('fraud/suspensions')
export class FraudSuspensionController {
  constructor(private readonly fraudSuspensionService: FraudSuspensionService) {}

  // ---------------------------------------------------------------------------
  // GET /fraud/suspensions — List suspensions
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({
    summary: 'List fraud suspensions',
    description: 'Returns a paginated list of fraud suspensions, filterable by status and userId.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of fraud suspensions', type: PaginatedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async listSuspensions(
    @Query() query: ListSuspensionsQueryDto,
  ): Promise<PaginatedResponseDto<FraudSuspensionResponseDto>> {
    return this.fraudSuspensionService.listSuspensions(query);
  }

  // ---------------------------------------------------------------------------
  // GET /fraud/suspensions/:id — Get suspension details
  // ---------------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({
    summary: 'Get fraud suspension details',
    description: 'Returns the details of a single fraud suspension by ID.',
  })
  @ApiParam({ name: 'id', description: 'Fraud suspension UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud suspension details', type: FraudSuspensionResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud suspension not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async getSuspension(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FraudSuspensionResponseDto> {
    return this.fraudSuspensionService.getSuspension(id);
  }

  // ---------------------------------------------------------------------------
  // POST /fraud/suspensions/:id/lift — Lift suspension
  // ---------------------------------------------------------------------------
  @Post(':id/lift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lift a fraud suspension',
    description: 'Lifts an ACTIVE fraud suspension and records the admin comment for audit trail.',
  })
  @ApiParam({ name: 'id', description: 'Fraud suspension UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud suspension lifted successfully', type: FraudSuspensionResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud suspension not found' })
  @ApiBadRequestResponse({ description: 'Suspension is not in ACTIVE status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async liftSuspension(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LiftSuspensionDto,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<FraudSuspensionResponseDto> {
    return this.fraudSuspensionService.liftSuspension(id, dto, currentUser.id);
  }
}
