/**
 * SSE event type definitions for all real-time channels.
 *
 * ADR-009: Real-time SSE strategy
 */

// ---------------------------------------------------------------------------
// Audience types
// ---------------------------------------------------------------------------

export type SseAudience = 'consumer' | 'partner' | 'admin';

// ---------------------------------------------------------------------------
// SSE event type constants
// ---------------------------------------------------------------------------

export const SSE_EVENT_TYPES = {
  // Consumer events
  STOCK_UPDATE: 'stock_update',
  RESERVATION_STATUS: 'reservation_status',
  NOTIFICATION: 'notification',
  UNREAD_COUNT: 'unread_count',

  // Partner events
  RESERVATION_RECEIVED: 'reservation_received',
  PICKUP_VALIDATED: 'pickup_validated',
  RESERVATION_CANCELLED: 'reservation_cancelled',

  // Admin events
  FRAUD_ALERT: 'fraud_alert',

  // System
  HEARTBEAT: 'heartbeat',
  CONNECTED: 'connected',
} as const;

export type SseEventType = (typeof SSE_EVENT_TYPES)[keyof typeof SSE_EVENT_TYPES];

// ---------------------------------------------------------------------------
// Domain event payloads (emitted by other BCs via EventEmitter2)
// ---------------------------------------------------------------------------

export interface StockUpdatedDomainEvent {
  basketId: string;
  stock: number;
  storeId: string;
}

export interface BasketPublishedDomainEvent {
  basketId: string;
  storeId: string;
}

export interface ReservationCreatedDomainEvent {
  reservationId: string;
  basketId: string;
  consumerId: string;
  storeId: string;
}

export interface ReservationConfirmedDomainEvent {
  reservationId: string;
  consumerId: string;
  storeId: string;
}

export interface ReservationCancelledDomainEvent {
  reservationId: string;
  consumerId: string;
  storeId: string;
  reason: string;
}

export interface ReservationReadyDomainEvent {
  reservationId: string;
  consumerId: string;
  storeId: string;
}

export interface ReservationPickedUpDomainEvent {
  reservationId: string;
  consumerId: string;
  storeId: string;
}

export interface ReservationNoShowDomainEvent {
  reservationId: string;
  consumerId: string;
  storeId: string;
}

// ---------------------------------------------------------------------------
// SSE message payloads (sent to clients)
// ---------------------------------------------------------------------------

export interface StockUpdateSsePayload {
  basketId: string;
  stock: number;
}

export interface ReservationStatusSsePayload {
  reservationId: string;
  status: string;
  reason?: string;
}

export interface ReservationReceivedSsePayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
}

export interface FraudAlertSsePayload {
  alertId: string;
  severity: string;
  description: string;
}

export interface ConnectedSsePayload {
  userId: string;
  audience: SseAudience;
  timestamp: string;
}

export interface HeartbeatSsePayload {
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Connection entry stored in the registry
// ---------------------------------------------------------------------------

export interface ConnectionEntry {
  connectionId: string;
  userId: string;
  audience: SseAudience;
  /** Basket IDs this consumer is subscribed to for stock updates */
  subscriptions: Set<string>;
  connectedAt: Date;
}
