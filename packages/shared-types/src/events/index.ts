// =============================================================================
// Domain Events — typed event contracts for cross-BC communication
// =============================================================================
// Convention (ADR-024 Q5):
// - Event names: PascalCase, past tense (e.g., BasketPublished)
// - All events carry: eventId, eventType, occurredAt, aggregateId
// - Payload is minimal: IDs and essential data only
// - Events are immutable once emitted
// =============================================================================

import type {
  BasketStatus,
  CancellationReason,
  ClaimStatus,
  FraudAlertSeverity,
  PartnerStatus,
  ReservationStatus,
  ResolutionType,
} from '../enums/index.js';

// =============================================================================
// Base Event
// =============================================================================

export interface DomainEvent<TPayload = unknown> {
  /** Unique event ID (UUID v7) */
  eventId: string;
  /** Fully-qualified event type name (e.g., 'catalog.basket.published') */
  eventType: string;
  /** ISO 8601 timestamp of when the event occurred */
  occurredAt: string;
  /** ID of the aggregate that emitted this event */
  aggregateId: string;
  /** Aggregate type (e.g., 'Basket', 'Reservation') */
  aggregateType: string;
  /** Event-specific payload */
  payload: TPayload;
  /** Optional metadata (actor, correlation ID, etc.) */
  metadata?: EventMetadata;
}

export interface EventMetadata {
  /** ID of the user/system that caused the event */
  actorId?: string;
  /** Correlation ID for tracing event chains */
  correlationId?: string;
  /** Causation ID — the event that caused this event */
  causationId?: string;
}

// =============================================================================
// Catalog Events
// =============================================================================

export interface BasketPublishedPayload {
  basketId: string;
  storeId: string;
  title: string;
  sellingPrice: number;
  stock: number;
  pickupStart: string;
  pickupEnd: string;
}
export type BasketPublishedEvent = DomainEvent<BasketPublishedPayload>;

export interface BasketSoldOutPayload {
  basketId: string;
  storeId: string;
}
export type BasketSoldOutEvent = DomainEvent<BasketSoldOutPayload>;

export interface BasketStockRestoredPayload {
  basketId: string;
  storeId: string;
  restoredQuantity: number;
  newStock: number;
}
export type BasketStockRestoredEvent = DomainEvent<BasketStockRestoredPayload>;

export interface BasketCancelledPayload {
  basketId: string;
  storeId: string;
  reason: string;
  previousStatus: BasketStatus;
}
export type BasketCancelledEvent = DomainEvent<BasketCancelledPayload>;

export interface BasketPickupWindowStartedPayload {
  basketId: string;
  storeId: string;
  pickupStart: string;
  pickupEnd: string;
}
export type BasketPickupWindowStartedEvent = DomainEvent<BasketPickupWindowStartedPayload>;

export interface BasketEndedPayload {
  basketId: string;
  storeId: string;
  soldCount: number;
  remainingStock: number;
}
export type BasketEndedEvent = DomainEvent<BasketEndedPayload>;

// =============================================================================
// Ordering Events
// =============================================================================

export interface ReservationConfirmedPayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
  storeId: string;
  quantity: number;
  totalPrice: number;
  pickupStart: string;
  pickupEnd: string;
}
export type ReservationConfirmedEvent = DomainEvent<ReservationConfirmedPayload>;

export interface ReservationCancelledByConsumerPayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
  storeId: string;
  quantity: number;
  reason: CancellationReason;
  previousStatus: ReservationStatus;
}
export type ReservationCancelledByConsumerEvent = DomainEvent<ReservationCancelledByConsumerPayload>;

export interface ReservationCancelledByPartnerPayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
  storeId: string;
  quantity: number;
  reason: CancellationReason;
}
export type ReservationCancelledByPartnerEvent = DomainEvent<ReservationCancelledByPartnerPayload>;

export interface ReservationReadyPayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
  storeId: string;
}
export type ReservationReadyEvent = DomainEvent<ReservationReadyPayload>;

export interface ReservationPickedUpPayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
  storeId: string;
  quantity: number;
  totalPrice: number;
  pickedUpAt: string;
}
export type ReservationPickedUpEvent = DomainEvent<ReservationPickedUpPayload>;

export interface ReservationNoShowPayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
  storeId: string;
  quantity: number;
  totalPrice: number;
}
export type ReservationNoShowEvent = DomainEvent<ReservationNoShowPayload>;

export interface ReservationExpiredPayload {
  reservationId: string;
  basketId: string;
  consumerId: string;
  quantity: number;
}
export type ReservationExpiredEvent = DomainEvent<ReservationExpiredPayload>;

// =============================================================================
// Payment Events
// =============================================================================

export interface PaymentCapturedPayload {
  transactionId: string;
  reservationId: string;
  consumerId: string;
  partnerId: string;
  amount: number;
  currency: string;
  commissionAmount: number;
  netPartnerAmount: number;
}
export type PaymentCapturedEvent = DomainEvent<PaymentCapturedPayload>;

export interface PaymentRefundedPayload {
  transactionId: string;
  reservationId: string;
  consumerId: string;
  refundedAmount: number;
  currency: string;
  reason: string;
}
export type PaymentRefundedEvent = DomainEvent<PaymentRefundedPayload>;

export interface PayoutCompletedPayload {
  payoutStatementId: string;
  partnerId: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
}
export type PayoutCompletedEvent = DomainEvent<PayoutCompletedPayload>;

// =============================================================================
// Partner Events
// =============================================================================

export interface PartnerActivatedPayload {
  partnerId: string;
  userId: string;
  activatedBy: string;
}
export type PartnerActivatedEvent = DomainEvent<PartnerActivatedPayload>;

export interface PartnerSuspendedPayload {
  partnerId: string;
  userId: string;
  reason: string;
  suspendedBy: string;
  previousStatus: PartnerStatus;
}
export type PartnerSuspendedEvent = DomainEvent<PartnerSuspendedPayload>;

export interface PartnerBannedPayload {
  partnerId: string;
  userId: string;
  reason: string;
  bannedBy: string;
}
export type PartnerBannedEvent = DomainEvent<PartnerBannedPayload>;

export interface StoreModificationApprovedPayload {
  requestId: string;
  storeId: string;
  approvedBy: string;
  changedFields: string[];
}
export type StoreModificationApprovedEvent = DomainEvent<StoreModificationApprovedPayload>;

export interface StoreModificationRejectedPayload {
  requestId: string;
  storeId: string;
  rejectedBy: string;
  rejectionReason: string;
}
export type StoreModificationRejectedEvent = DomainEvent<StoreModificationRejectedPayload>;

// =============================================================================
// Review & Claims Events
// =============================================================================

export interface ReviewCreatedPayload {
  reviewId: string;
  reservationId: string;
  consumerId: string;
  partnerId: string;
  storeId: string;
  rating: number;
}
export type ReviewCreatedEvent = DomainEvent<ReviewCreatedPayload>;

export interface ClaimOpenedPayload {
  claimId: string;
  reservationId: string;
  consumerId: string;
  storeId: string;
  reasonSlug: string;
}
export type ClaimOpenedEvent = DomainEvent<ClaimOpenedPayload>;

export interface ClaimResolvedPayload {
  claimId: string;
  reservationId: string;
  consumerId: string;
  storeId: string;
  previousStatus: ClaimStatus;
  resolutionType: ResolutionType;
  refundAmount: number | null;
  resolvedBy: string;
}
export type ClaimResolvedEvent = DomainEvent<ClaimResolvedPayload>;

export interface ClaimRejectedPayload {
  claimId: string;
  reservationId: string;
  consumerId: string;
  storeId: string;
  rejectedBy: string;
  reason: string;
}
export type ClaimRejectedEvent = DomainEvent<ClaimRejectedPayload>;

// =============================================================================
// Fraud Events
// =============================================================================

export interface FraudAlertCreatedPayload {
  alertId: string;
  actorId: string;
  ruleId: string;
  ruleName: string;
  severity: FraudAlertSeverity;
  metric: string;
  currentValue: number;
  threshold: number;
}
export type FraudAlertCreatedEvent = DomainEvent<FraudAlertCreatedPayload>;

export interface FraudAutoSuspendPayload {
  alertId: string;
  actorId: string;
  actorType: 'CONSUMER' | 'PARTNER';
  reason: string;
  severity: FraudAlertSeverity;
}
export type FraudAutoSuspendEvent = DomainEvent<FraudAutoSuspendPayload>;

// =============================================================================
// Event Type Constants — use these as eventType values
// =============================================================================

export const DOMAIN_EVENTS = {
  // Catalog
  BASKET_PUBLISHED: 'catalog.basket.published',
  BASKET_SOLD_OUT: 'catalog.basket.sold_out',
  BASKET_STOCK_RESTORED: 'catalog.basket.stock_restored',
  BASKET_CANCELLED: 'catalog.basket.cancelled',
  BASKET_PICKUP_WINDOW_STARTED: 'catalog.basket.pickup_window_started',
  BASKET_ENDED: 'catalog.basket.ended',

  // Ordering
  RESERVATION_CONFIRMED: 'ordering.reservation.confirmed',
  RESERVATION_CANCELLED_BY_CONSUMER: 'ordering.reservation.cancelled_by_consumer',
  RESERVATION_CANCELLED_BY_PARTNER: 'ordering.reservation.cancelled_by_partner',
  RESERVATION_READY: 'ordering.reservation.ready',
  RESERVATION_PICKED_UP: 'ordering.reservation.picked_up',
  RESERVATION_NO_SHOW: 'ordering.reservation.no_show',
  RESERVATION_EXPIRED: 'ordering.reservation.expired',

  // Payment
  PAYMENT_CAPTURED: 'payment.transaction.captured',
  PAYMENT_REFUNDED: 'payment.transaction.refunded',
  PAYOUT_COMPLETED: 'payment.payout.completed',

  // Partner
  PARTNER_ACTIVATED: 'partner.partner.activated',
  PARTNER_SUSPENDED: 'partner.partner.suspended',
  PARTNER_BANNED: 'partner.partner.banned',
  STORE_MODIFICATION_APPROVED: 'partner.store_modification.approved',
  STORE_MODIFICATION_REJECTED: 'partner.store_modification.rejected',

  // Review & Claims
  REVIEW_CREATED: 'review.review.created',
  CLAIM_OPENED: 'claims.claim.opened',
  CLAIM_RESOLVED: 'claims.claim.resolved',
  CLAIM_REJECTED: 'claims.claim.rejected',

  // Fraud
  FRAUD_ALERT_CREATED: 'fraud.alert.created',
  FRAUD_AUTO_SUSPEND: 'fraud.alert.auto_suspend',
} as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
