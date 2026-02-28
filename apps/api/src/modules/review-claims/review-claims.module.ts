// =============================================================================
// ReviewClaimsModule — BC Review & Claims (ADR-002, ADR-024)
// =============================================================================
// Hexagonal architecture:
// - Domain: pure entities, rules, error types
// - Ports: abstract interfaces (ClaimRepositoryPort, ReviewRepositoryPort)
// - Adapters: PrismaClaimRepository, PrismaReviewRepository
// - Application: ClaimService (state machine + refund), ReviewService (CRUD)
// - Controllers: ClaimsController, ReviewsController, AdminReviewClaimsController
//
// Inter-BC communication:
// - Imports PaymentsModule for refund capability (via PAYMENT_SERVICE token)
// - Emits domain events: ClaimOpened, ClaimResolved, ClaimRejected, ReviewCreated
// =============================================================================

import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { StateMachineService } from '../../shared/state-machine';

// Controllers
import { ClaimsController } from './controllers/claims.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { AdminReviewClaimsController } from './controllers/admin-review-claims.controller';

// Application services
import { ClaimService } from './application/services/claim.service';
import { ReviewService } from './application/services/review.service';

// Ports (abstract classes — driving contracts)
import { ClaimRepositoryPort } from './ports/claim.repository.port';
import { ReviewRepositoryPort } from './ports/review.repository.port';

// Adapters (concrete implementations)
import { PrismaClaimRepository } from './adapters/prisma/prisma-claim.repository';
import { PrismaReviewRepository } from './adapters/prisma/prisma-review.repository';

@Module({
  imports: [
    // Import PaymentsModule to access PAYMENT_SERVICE token for refunds
    PaymentsModule,
  ],
  controllers: [
    ClaimsController,
    ReviewsController,
    AdminReviewClaimsController,
  ],
  providers: [
    // State machine engine (shared)
    StateMachineService,

    // Application services
    ClaimService,
    ReviewService,

    // Port → Adapter bindings (dependency inversion)
    {
      provide: ClaimRepositoryPort,
      useClass: PrismaClaimRepository,
    },
    {
      provide: ReviewRepositoryPort,
      useClass: PrismaReviewRepository,
    },
  ],
  exports: [ClaimService, ReviewService],
})
export class ReviewClaimsModule {}
