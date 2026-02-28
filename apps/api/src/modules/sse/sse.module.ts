import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';
import { SseConnectionRegistry } from './sse-connection.registry';
import { StockListener } from './channels/stock.listener';
import { ReservationListener } from './channels/reservation.listener';
import { NotificationListener } from './channels/notification.listener';
import { FraudListener } from './channels/fraud.listener';

/**
 * SseModule — real-time server-sent events for all user audiences.
 *
 * Architecture:
 * - SseConnectionRegistry: manages the Map<userId, connections> lifecycle
 * - SseService: high-level API (connect, emit, heartbeat)
 * - SseController: 3 @Sse() endpoints (consumer, partner, admin)
 * - Channel listeners: bridge EventEmitter2 domain events → SSE dispatch
 *
 * Phase 1 (MVP): in-process EventEmitter2 only. No Redis Pub/Sub.
 * Phase 2: replace listeners with Redis Pub/Sub for multi-instance support.
 *
 * ADR-009: Real-time SSE strategy
 * ADR-002: Monolithe modulaire — no direct imports from other BCs
 */
@Module({
  imports: [
    // EventEmitterModule is already initialized in AppModule with forRoot().
    // Importing it here ensures the module's @OnEvent decorators are registered.
    // forRoot() is idempotent when called multiple times.
    EventEmitterModule.forRoot(),
  ],
  controllers: [SseController],
  providers: [
    SseService,
    SseConnectionRegistry,
    // Channel listeners — subscribe to domain events from other BCs
    StockListener,
    ReservationListener,
    NotificationListener,
    FraudListener,
  ],
  exports: [SseService],
})
export class SseModule {}
