import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SseService } from '../sse.service';
import { SSE_EVENT_TYPES } from '../types/sse-event.types';

/**
 * Domain event payload emitted by the notification BC.
 */
interface NotificationCreatedDomainEvent {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  unreadCount: number;
}

/**
 * Listens to notification domain events and pushes them to the consumer SSE stream.
 *
 * Forwards:
 * - `notification.created` → to the target user (notification + unread_count)
 *
 * ADR-009: In-process EventEmitter2 for Phase 1
 */
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly sseService: SseService) {}

  // ---------------------------------------------------------------------------
  // notification.created
  // ---------------------------------------------------------------------------

  @OnEvent('notification.created')
  handleNotificationCreated(event: NotificationCreatedDomainEvent): void {
    this.logger.debug(
      `Handling notification.created: notificationId=${event.notificationId} userId=${event.userId}`,
    );

    // Push the notification payload to the user
    this.sseService.emitToUser(
      event.userId,
      SSE_EVENT_TYPES.NOTIFICATION,
      {
        notificationId: event.notificationId,
        type: event.type,
        title: event.title,
        body: event.body,
      },
    );

    // Push the updated unread count to the user
    this.sseService.emitToUser(
      event.userId,
      SSE_EVENT_TYPES.UNREAD_COUNT,
      {
        unreadCount: event.unreadCount,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // notification.read (unread count decremented)
  // ---------------------------------------------------------------------------

  @OnEvent('notification.read')
  handleNotificationRead(event: { userId: string; unreadCount: number }): void {
    this.logger.debug(
      `Handling notification.read: userId=${event.userId} unreadCount=${event.unreadCount}`,
    );

    this.sseService.emitToUser(
      event.userId,
      SSE_EVENT_TYPES.UNREAD_COUNT,
      {
        unreadCount: event.unreadCount,
      },
    );
  }
}
