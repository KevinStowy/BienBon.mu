import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * AuditModule provides read-only admin access to the audit trail.
 *
 * Endpoints: list (paginated), detail, export CSV, user timeline.
 *
 * PrismaService is injected globally.
 *
 * ADR-002: Monolithe modulaire
 * ADR-004: REST API + OpenAPI
 * ADR-011: RBAC — ADMIN and SUPER_ADMIN only
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
