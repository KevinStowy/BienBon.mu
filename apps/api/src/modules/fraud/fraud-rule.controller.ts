import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { FraudRuleService } from './fraud-rule.service';
import { CreateFraudRuleDto } from './dto/create-fraud-rule.dto';
import { UpdateFraudRuleDto } from './dto/update-fraud-rule.dto';
import { FraudRuleResponseDto } from './dto/fraud-rule-response.dto';
import { ListFraudRulesQueryDto } from './dto/list-fraud-rules-query.dto';
import { PaginatedResponseDto } from '../../shared/dto/pagination.dto';

/**
 * Controller for managing fraud detection rules.
 * All endpoints require ADMIN or SUPER_ADMIN role.
 */
@ApiTags('fraud')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('fraud/rules')
export class FraudRuleController {
  constructor(private readonly fraudRuleService: FraudRuleService) {}

  // ---------------------------------------------------------------------------
  // GET /fraud/rules — List rules
  // ---------------------------------------------------------------------------
  @Get()
  @ApiOperation({
    summary: 'List fraud detection rules',
    description: 'Returns a paginated list of fraud rules, filterable by actorType and isActive.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of fraud rules', type: PaginatedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async listRules(
    @Query() query: ListFraudRulesQueryDto,
  ): Promise<PaginatedResponseDto<FraudRuleResponseDto>> {
    return this.fraudRuleService.listRules(query);
  }

  // ---------------------------------------------------------------------------
  // GET /fraud/rules/:id — Get rule details
  // ---------------------------------------------------------------------------
  @Get(':id')
  @ApiOperation({
    summary: 'Get fraud rule details',
    description: 'Returns the details of a single fraud rule by ID.',
  })
  @ApiParam({ name: 'id', description: 'Fraud rule UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud rule details', type: FraudRuleResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud rule not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async getRule(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FraudRuleResponseDto> {
    return this.fraudRuleService.getRule(id);
  }

  // ---------------------------------------------------------------------------
  // POST /fraud/rules — Create rule
  // ---------------------------------------------------------------------------
  @Post()
  @ApiOperation({
    summary: 'Create a new fraud detection rule',
    description: 'Creates a new rule for the fraud detection engine.',
  })
  @ApiResponse({ status: 201, description: 'Fraud rule created successfully', type: FraudRuleResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'A rule with the same slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async createRule(
    @Body() dto: CreateFraudRuleDto,
  ): Promise<FraudRuleResponseDto> {
    return this.fraudRuleService.createRule(dto);
  }

  // ---------------------------------------------------------------------------
  // PATCH /fraud/rules/:id — Update rule
  // ---------------------------------------------------------------------------
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a fraud detection rule',
    description: 'Partially updates an existing fraud rule. Only provided fields are updated.',
  })
  @ApiParam({ name: 'id', description: 'Fraud rule UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud rule updated successfully', type: FraudRuleResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud rule not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'A rule with the same slug already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFraudRuleDto,
  ): Promise<FraudRuleResponseDto> {
    return this.fraudRuleService.updateRule(id, dto);
  }

  // ---------------------------------------------------------------------------
  // POST /fraud/rules/:id/toggle — Toggle isActive
  // ---------------------------------------------------------------------------
  @Post(':id/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle fraud rule active status',
    description: 'Toggles the isActive flag of a fraud rule between true and false.',
  })
  @ApiParam({ name: 'id', description: 'Fraud rule UUID', type: String })
  @ApiResponse({ status: 200, description: 'Fraud rule active status toggled', type: FraudRuleResponseDto })
  @ApiNotFoundResponse({ description: 'Fraud rule not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions (ADMIN or SUPER_ADMIN required)' })
  async toggleRule(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FraudRuleResponseDto> {
    return this.fraudRuleService.toggleActive(id);
  }
}
