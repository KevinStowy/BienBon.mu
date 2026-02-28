import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SseService } from '../sse.service';
import { SSE_EVENT_TYPES } from '../types/sse-event.types';

/**
 * Domain event payload emitted by the fraud BC.
 */
interface FraudAlertCreatedDomainEvent {
  alertId: string;
  severity: string;
  description: string;
  userId?: string;
  storeId?: string;
  detectedAt: string;
}

/**
 * Listens to fraud domain events and pushes alerts to the admin SSE stream.
 *
 * Forwards:
 * - `fraud.alert.created` → dispatched to all admin connections
 * - `fraud.alert.escalated` → dispatched to all admin connections
 *
 * Admin-only audience: only ADMIN and SUPER_ADMIN roles can subscribe to /sse/admin.
 *
 * ADR-009: In-process EventEmitter2 for Phase 1
 * ADR-019: Fraud detection — alerts must be immediately visible to admins
 */
@Injectable()
export class FraudListener {
  private readonly logger = new Logger(FraudListener.name);

  constructor(private readonly sseService: SseService) {}

  // ---------------------------------------------------------------------------
  // fraud.alert.created
  // ---------------------------------------------------------------------------

  @OnEvent('fraud.alert.created')
  handleFraudAlertCreated(event: FraudAlertCreatedDomainEvent): void {
    this.logger.log(
      `Handling fraud.alert.created: alertId=${event.alertId} severity=${event.severity}`,
    );

    this.sseService.emitToAudience('admin', SSE_EVENT_TYPES.FRAUD_ALERT, {
      alertId: event.alertId,
      severity: event.severity,
      description: event.description,
      userId: event.userId,
      storeId: event.storeId,
      detectedAt: event.detectedAt,
    });
  }

  // ---------------------------------------------------------------------------
  // fraud.alert.escalated
  // ---------------------------------------------------------------------------

  @OnEvent('fraud.alert.escalated')
  handleFraudAlertEscalated(
    event: FraudAlertCreatedDomainEvent & { escalatedAt: string },
  ): void {
    this.logger.log(
      `Handling fraud.alert.escalated: alertId=${event.alertId} severity=${event.severity}`,
    );

    this.sseService.emitToAudience('admin', SSE_EVENT_TYPES.FRAUD_ALERT, {
      alertId: event.alertId,
      severity: event.severity,
      description: event.description,
      userId: event.userId,
      storeId: event.storeId,
      detectedAt: event.detectedAt,
      escalatedAt: event.escalatedAt,
    });
  }
}
