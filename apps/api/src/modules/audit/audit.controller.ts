// =============================================================================
// AuditController — admin endpoints for audit log
// =============================================================================

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';
import {
  ListAuditQueryDto,
  PaginatedAuditResponseDto,
  AuditEntryDto,
} from './dto/audit.dto';

@ApiTags('Admin - Audit')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/v1/admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/audit — List audit entries (paginated)
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'List audit log entries',
    description: 'Returns a paginated list of audit log entries with optional filters.',
  })
  @ApiResponse({ status: 200, description: 'Audit entries returned', type: PaginatedAuditResponseDto })
  async listEntries(
    @Query() query: ListAuditQueryDto,
  ): Promise<PaginatedAuditResponseDto> {
    return this.auditService.listEntries(query);
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/audit/export — Export CSV
  // ---------------------------------------------------------------------------

  @Get('export')
  @ApiOperation({
    summary: 'Export audit log as CSV',
    description: 'Exports filtered audit log entries as a CSV file.',
  })
  @ApiResponse({ status: 200, description: 'CSV file returned' })
  async exportCsv(
    @Query() query: ListAuditQueryDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const csv = await this.auditService.exportCsv(query);
    void reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="audit-log.csv"')
      .send(csv);
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/audit/timeline/:userId — User timeline
  // ---------------------------------------------------------------------------

  @Get('timeline/:userId')
  @ApiOperation({
    summary: 'Get user audit timeline',
    description: 'Returns all audit entries for a specific user, sorted chronologically.',
  })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Timeline entries returned', type: [AuditEntryDto] })
  async getUserTimeline(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AuditEntryDto[]> {
    return this.auditService.getUserTimeline(userId);
  }

  // ---------------------------------------------------------------------------
  // GET /api/v1/admin/audit/:id — Single entry detail
  // ---------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({
    summary: 'Get audit entry detail',
    description: 'Returns a single audit log entry with all metadata.',
  })
  @ApiParam({ name: 'id', description: 'Audit entry ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Audit entry returned', type: AuditEntryDto })
  @ApiResponse({ status: 404, description: 'Audit entry not found' })
  async getEntry(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditEntryDto> {
    return this.auditService.getEntry(id);
  }
}
