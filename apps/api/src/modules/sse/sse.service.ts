import { Injectable, Logger } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, interval, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { SseConnectionRegistry } from './sse-connection.registry';
import type { SseAudience } from './types/sse-event.types';
import { SSE_EVENT_TYPES } from './types/sse-event.types';

/**
 * SSE Service — orchestrates connections, heartbeats, and event emission.
 *
 * Wraps the SseConnectionRegistry with higher-level helpers and
 * injects a 30-second heartbeat into every stream to keep connections alive
 * through proxies and load balancers.
 *
 * ADR-009: Real-time SSE infrastructure
 */
@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);

  /** Heartbeat interval in milliseconds */
  private readonly HEARTBEAT_INTERVAL_MS = 30_000;

  constructor(private readonly registry: SseConnectionRegistry) {}

  // ---------------------------------------------------------------------------
  // Connection lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Creates a new SSE observable for the given user.
   *
   * Merges:
   * 1. The user's event stream from the registry
   * 2. A periodic heartbeat every 30 seconds
   *
   * Sends an initial "connected" event so the client knows the stream is live.
   *
   * @param userId         Internal user ID
   * @param audience       The audience type (consumer | partner | admin)
   * @param subscriptions  Optional basket IDs for stock update subscriptions (consumer only)
   * @param lastEventId    Optional Last-Event-ID header for reconnect replay
   * @returns              Observable<MessageEvent> to return from the @Sse handler
   */
  connect(
    userId: string,
    audience: SseAudience,
    subscriptions?: string[],
    lastEventId?: string,
  ): Observable<MessageEvent> {
    const { connectionId, observable } = this.registry.register(
      userId,
      audience,
      subscriptions,
    );

    this.logger.log(
      `SSE connected: userId=${userId} audience=${audience} connectionId=${connectionId}`,
    );

    // Heartbeat stream — keeps connections alive through proxies
    const heartbeat$ = interval(this.HEARTBEAT_INTERVAL_MS).pipe(
      map(
        (): MessageEvent => ({
          type: SSE_EVENT_TYPES.HEARTBEAT,
          data: { timestamp: new Date().toISOString() },
        }),
      ),
    );

    // Merged stream: user events + heartbeat
    const merged$ = merge(observable, heartbeat$);

    // Replay buffered events if the client provided Last-Event-ID
    if (lastEventId !== undefined && lastEventId !== '') {
      this.logger.debug(
        `Client reconnecting with Last-Event-ID=${lastEventId}, userId=${userId}`,
      );
      // In Phase 1, in-memory buffers are not persisted across process restarts.
      // We emit the connected event and the client re-subscribes from now.
    }

    // Immediately push connected event into the user's stream
    this.emitToUser(userId, SSE_EVENT_TYPES.CONNECTED, {
      userId,
      audience,
      connectionId,
      timestamp: new Date().toISOString(),
    });

    return merged$;
  }

  // ---------------------------------------------------------------------------
  // Emission helpers
  // ---------------------------------------------------------------------------

  /**
   * Sends an event to all connections of a specific user.
   */
  emitToUser(userId: string, eventType: string, data: Record<string, unknown>): void {
    const event: MessageEvent = {
      type: eventType,
      data,
    };
    this.registry.dispatchToUser(userId, event);
  }

  /**
   * Sends an event to all connections with the given audience.
   */
  emitToAudience(audience: SseAudience, eventType: string, data: Record<string, unknown>): void {
    const event: MessageEvent = {
      type: eventType,
      data,
    };
    this.registry.dispatchToAudience(audience, event);
  }

  /**
   * Sends an event to all consumers subscribed to a specific basket.
   */
  emitToChannel(basketId: string, eventType: string, data: Record<string, unknown>): void {
    const event: MessageEvent = {
      type: eventType,
      data,
    };
    this.registry.dispatchToSubscribers(basketId, event);
  }

  // ---------------------------------------------------------------------------
  // Rate limiting
  // ---------------------------------------------------------------------------

  isReconnectRateLimited(userId: string): boolean {
    return this.registry.isReconnectRateLimited(userId);
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  getConnectionCount(): number {
    return this.registry.getConnectionCount();
  }
}
