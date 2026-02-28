import { Injectable, Logger } from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import type { SseAudience, ConnectionEntry } from './types/sse-event.types';

/**
 * Manages all active SSE connections.
 *
 * Each user can have multiple concurrent connections (e.g. multiple browser tabs).
 * Connections are stored in a map: userId → Map<connectionId, { subject, entry }>.
 *
 * Provides dispatch methods:
 * - dispatchToUser: sends an event to all connections of a specific user
 * - dispatchToAudience: sends an event to all users of a given audience
 * - dispatchToSubscribers: sends an event to consumers subscribed to a specific channel (basket)
 *
 * ADR-009: Real-time SSE — in-process EventEmitter2, no Redis for Phase 1
 */
@Injectable()
export class SseConnectionRegistry {
  private readonly logger = new Logger(SseConnectionRegistry.name);

  /**
   * userId → Map<connectionId, { subject, entry }>
   */
  private readonly connections = new Map<
    string,
    Map<string, { subject: Subject<MessageEvent>; entry: ConnectionEntry }>
  >();

  /**
   * Track last reconnect time per user to rate-limit reconnects.
   * userId → timestamp (ms)
   */
  private readonly lastReconnectAt = new Map<string, number>();

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Registers a new SSE connection for a user.
   *
   * @returns { connectionId, observable } — the observable must be returned by the controller @Sse handler
   */
  register(
    userId: string,
    audience: SseAudience,
    subscriptions?: string[],
  ): { connectionId: string; observable: Observable<MessageEvent> } {
    const connectionId = randomUUID();

    const subject = new Subject<MessageEvent>();

    const entry: ConnectionEntry = {
      connectionId,
      userId,
      audience,
      subscriptions: new Set(subscriptions ?? []),
      connectedAt: new Date(),
    };

    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.connections.get(userId)!.set(connectionId, { subject, entry });

    this.logger.debug(
      `Connection registered: userId=${userId} connectionId=${connectionId} audience=${audience}`,
    );

    const observable = subject.asObservable().pipe(
      finalize(() => {
        this.unregister(userId, connectionId);
      }),
    );

    return { connectionId, observable };
  }

  /**
   * Removes a specific connection from the registry.
   * Called automatically when the observable completes (client disconnects).
   */
  unregister(userId: string, connectionId: string): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections) {
      return;
    }

    userConnections.delete(connectionId);

    if (userConnections.size === 0) {
      this.connections.delete(userId);
    }

    this.logger.debug(
      `Connection unregistered: userId=${userId} connectionId=${connectionId}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Rate limiting helper
  // ---------------------------------------------------------------------------

  /**
   * Checks if a user is reconnecting too fast (within 5 seconds of last reconnect).
   * Returns true if the reconnect should be rejected.
   */
  isReconnectRateLimited(userId: string): boolean {
    const now = Date.now();
    const last = this.lastReconnectAt.get(userId);

    if (last !== undefined && now - last < 5_000) {
      return true;
    }

    this.lastReconnectAt.set(userId, now);
    return false;
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  /**
   * Sends an event to all connections of a specific user.
   */
  dispatchToUser(userId: string, event: MessageEvent): void {
    const userConnections = this.connections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      return;
    }

    for (const { subject } of userConnections.values()) {
      subject.next(event);
    }
  }

  /**
   * Sends an event to all connections with the given audience.
   */
  dispatchToAudience(audience: SseAudience, event: MessageEvent): void {
    for (const [, userConnections] of this.connections) {
      for (const { subject, entry } of userConnections.values()) {
        if (entry.audience === audience) {
          subject.next(event);
        }
      }
    }
  }

  /**
   * Sends an event to all consumers who have subscribed to a specific channel
   * (identified by basketId).
   */
  dispatchToSubscribers(basketId: string, event: MessageEvent): void {
    for (const [, userConnections] of this.connections) {
      for (const { subject, entry } of userConnections.values()) {
        if (entry.subscriptions.has(basketId)) {
          subject.next(event);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  getConnectionCount(): number {
    let total = 0;
    for (const [, userConnections] of this.connections) {
      total += userConnections.size;
    }
    return total;
  }

  getConnectionCountByAudience(audience: SseAudience): number {
    let total = 0;
    for (const [, userConnections] of this.connections) {
      for (const { entry } of userConnections.values()) {
        if (entry.audience === audience) {
          total += 1;
        }
      }
    }
    return total;
  }
}
