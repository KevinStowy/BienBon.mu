import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controller
import { ReservationController } from './api/reservation.controller';

// Application service
import { ReservationService } from './application/services/reservation.service';

// Ports (abstract classes)
import { ReservationRepositoryPort } from './ports/reservation.repository.port';
import { CatalogPort } from './ports/catalog.port';
// Adapters (concrete implementations)
import { PrismaReservationRepository } from './adapters/prisma/prisma-reservation.repository';
import { CatalogAdapter } from './adapters/catalog/catalog.adapter';

/**
 * OrderingModule — bounded context for reservations and pickup flow.
 *
 * Hexagonal architecture (ADR-024):
 * - Domain: pure entities, state machine, business rules
 * - Ports: abstract interfaces (inbound & outbound)
 * - Adapters: Prisma (outbound), CatalogAdapter (outbound), NoopPayment (outbound)
 * - Application: ReservationService orchestrator
 * - API: ReservationController (inbound adapter)
 *
 * State machine (ADR-017):
 * PENDING_PAYMENT → CONFIRMED → READY → PICKED_UP
 *                             ↓
 *                     CANCELLED_CONSUMER | CANCELLED_PARTNER
 *                ↓
 *            EXPIRED | CANCELLED_PARTNER
 *                                       READY → NO_SHOW
 *
 * Stock operations are atomic via raw SQL (ADR-008).
 * Domain events emitted via EventEmitter2 for inter-BC communication (ADR-024).
 * Payment stubbed via NoopPaymentAdapter until BC Payment is implemented (ADR-005).
 *
 * Note: PrismaService is injected globally via SharedModule (marked @Global).
 * EventEmitterModule.forRoot() is idempotent — safe to import in multiple modules.
 */
@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [ReservationController],
  providers: [
    ReservationService,

    // Port → Adapter bindings (dependency inversion)
    {
      provide: ReservationRepositoryPort,
      useClass: PrismaReservationRepository,
    },
    {
      provide: CatalogPort,
      useClass: CatalogAdapter,
    },
  ],
  exports: [ReservationService],
})
export class OrderingModule {}
