// =============================================================================
// PaymentsModule — BC Payment bounded context
// =============================================================================
// Hexagonal architecture (ADR-024):
// - Domain: pure entities, rules, error types
// - Ports: abstract interfaces (inbound & outbound)
// - Adapters: MockPeachPaymentsAdapter, PrismaPaymentRepository, PrismaLedgerRepository
// - Application: PaymentOrchestratorService, LedgerService, CommissionService
// - Controllers: PaymentsController, WebhooksController, AdminFinanceController
//
// Inter-BC communication (ADR-024):
// - Exports PAYMENT_SERVICE token — Ordering and Claims BC use this via injection
// - Emits domain events: payment.transaction.captured, payment.transaction.refunded
//
// Mock adapter (ADR-005):
// - MockPeachPaymentsAdapter simulates all Peach API operations
// - Swap with real PeachPaymentsAdapter once API keys are available
// =============================================================================

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { PaymentsController } from './controllers/payments.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { AdminFinanceController } from './controllers/admin-finance.controller';

// Application services
import { PaymentOrchestratorService } from './application/services/payment-orchestrator.service';
import { LedgerService } from './application/services/ledger.service';
import { CommissionService } from './application/services/commission.service';

// Ports (abstract classes — driving contracts)
import { PaymentGatewayPort } from './ports/payment-gateway.port';
import { PaymentTransactionRepositoryPort } from './ports/payment-transaction.repository.port';
import { LedgerRepositoryPort } from './ports/ledger.repository.port';

// Adapters (concrete implementations)
import { MockPeachPaymentsAdapter } from './adapters/peach/peach-payments.adapter';
import { PrismaPaymentRepository } from './adapters/prisma/prisma-payment.repository';
import { PrismaLedgerRepository } from './adapters/prisma/prisma-ledger.repository';

// Shared injection token
import { PAYMENT_SERVICE } from '@bienbon/shared-types';

@Module({
  imports: [
    // EventEmitter is idempotent — safe to import multiple times
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    PaymentsController,
    WebhooksController,
    AdminFinanceController,
  ],
  providers: [
    // Application services
    PaymentOrchestratorService,
    LedgerService,
    CommissionService,

    // Port → Adapter bindings (dependency inversion)
    {
      provide: PaymentGatewayPort,
      useClass: MockPeachPaymentsAdapter,
    },
    {
      provide: PaymentTransactionRepositoryPort,
      useClass: PrismaPaymentRepository,
    },
    {
      provide: LedgerRepositoryPort,
      useClass: PrismaLedgerRepository,
    },

    // Shared-types injection token — used by Ordering and Claims BCs
    {
      provide: PAYMENT_SERVICE,
      useExisting: PaymentOrchestratorService,
    },
  ],
  exports: [
    // Export the service token so other modules can inject via PAYMENT_SERVICE
    PAYMENT_SERVICE,
    PaymentOrchestratorService,
    // Export repo so other modules can read transaction state if needed
    PaymentTransactionRepositoryPort,
  ],
})
export class PaymentsModule {}
