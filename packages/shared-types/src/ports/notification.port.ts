// =============================================================================
// INotificationService — Port for Notification bounded context (BC-9)
// =============================================================================
// Used by: all BCs that need to send notifications
// Communication type: asynchronous (fire-and-forget via BullMQ in practice,
// but the port interface is Promise-based for flexibility)
// See: ADR-024 section 3.2 (BC-9)
// =============================================================================

import type {
  NotificationPreferencesDto,
  ScheduleNotificationParams,
  SendBulkNotificationParams,
  SendNotificationParams,
  UpdateNotificationPreferencesParams,
} from '../dto/index.js';

export interface INotificationService {
  /**
   * Send a notification to a single user.
   * Respects user's notification preferences (channel opt-out).
   */
  send(params: SendNotificationParams): Promise<void>;

  /**
   * Send a notification to multiple users.
   * Respects each user's notification preferences.
   */
  sendBulk(params: SendBulkNotificationParams): Promise<void>;

  /**
   * Schedule a notification for future delivery.
   * Returns a job ID that can be used to cancel the scheduled notification.
   */
  schedule(params: ScheduleNotificationParams): Promise<string>;

  /**
   * Cancel a previously scheduled notification by job ID.
   */
  cancelScheduled(jobId: string): Promise<void>;

  /**
   * Get a user's notification preferences.
   */
  getPreferences(userId: string): Promise<NotificationPreferencesDto>;

  /**
   * Update a user's notification preferences.
   */
  updatePreferences(
    userId: string,
    prefs: UpdateNotificationPreferencesParams,
  ): Promise<void>;
}

/** Injection token for INotificationService */
export const NOTIFICATION_SERVICE = Symbol('INotificationService');
