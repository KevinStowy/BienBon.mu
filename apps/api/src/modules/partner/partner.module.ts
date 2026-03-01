// =============================================================================
// Partner Module — hexagonal architecture (ADR-024)
// =============================================================================
// Domain:      entities, errors, rules, value objects (pure)
// Ports:       PartnerRepositoryPort, PartnerRegistrationRepositoryPort
// Adapters:    PrismaPartnerRepository, PrismaPartnerRegistrationRepository
// Application: PartnerService, PartnerRegistrationService
// API:         PartnerController, PartnerAdminController
// =============================================================================

import { Module } from '@nestjs/common';
import { StateMachineService } from '../../shared/state-machine';

// Application layer
import { PartnerService } from './application/services/partner.service';
import { PartnerRegistrationService } from './application/services/partner-registration.service';

// Ports (abstract classes — dependency inversion)
import { PartnerRepositoryPort } from './ports/partner.repository.port';
import { PartnerRegistrationRepositoryPort } from './ports/partner-registration.repository.port';

// Adapters (concrete Prisma implementations)
import { PrismaPartnerRepository } from './adapters/prisma/prisma-partner.repository';
import { PrismaPartnerRegistrationRepository } from './adapters/prisma/prisma-partner-registration.repository';

// API layer (inbound adapters)
import { PartnerController } from './api/partner.controller';
import { PartnerAdminController } from './api/partner-admin.controller';

/**
 * PartnerModule — bounded context for partner onboarding and lifecycle management.
 *
 * Hexagonal architecture (ADR-024):
 * - Domain: pure entities, state machine, business rules
 * - Ports: abstract interfaces (outbound)
 * - Adapters: Prisma (outbound)
 * - Application: PartnerService, PartnerRegistrationService (orchestrators)
 * - API: Controllers (inbound adapters)
 *
 * State machine (ADR-017):
 * PENDING → ACTIVE | REJECTED | CANCELLED
 * ACTIVE  → SUSPENDED | BANNED
 * SUSPENDED → ACTIVE | BANNED
 * REJECTED → ACTIVE
 *
 * Domain events emitted via EventEmitter2 for inter-BC communication (ADR-024).
 * Note: PrismaService is injected globally via SharedModule (marked @Global).
 */
@Module({
  controllers: [PartnerController, PartnerAdminController],
  providers: [
    StateMachineService,
    PartnerService,
    PartnerRegistrationService,

    // Port → Adapter bindings (dependency inversion, ADR-027)
    {
      provide: PartnerRepositoryPort,
      useClass: PrismaPartnerRepository,
    },
    {
      provide: PartnerRegistrationRepositoryPort,
      useClass: PrismaPartnerRegistrationRepository,
    },
  ],
  exports: [PartnerService, PartnerRegistrationService],
})
export class PartnerModule {}
