// =============================================================================
// @bienbon/shared-types — Public API
// =============================================================================

// --- Enums ---
export {
  Role,
  UserStatus,
  PartnerStatus,
  StoreStatus,
  StoreType,
  StoreRole,
  ApprovalStatus,
  RegistrationChannel,
  BasketStatus,
  RecurringTemplateStatus,
  ReservationStatus,
  CancellationReason,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PayoutStatementStatus,
  ClaimStatus,
  ResolutionType,
  NotificationType,
  NotificationChannel,
  FraudAlertSeverity,
  FraudAlertStatus,
  SuspensionStatus,
  ReferralStatus,
  LedgerAccountType,
  NormalBalance,
  ReconAlertType,
  ReconAlertSeverity,
} from './enums/index.js';

// --- DTOs ---
export type {
  // Pagination
  PaginationDto,
  PaginatedResponse,
  // Catalog
  BasketDto,
  BasketSummaryDto,
  TagDto,
  AvailableBasketsFilter,
  StockOperationResult,
  // Partner / Store
  StoreDto,
  StoreSummaryDto,
  UpdateStoreParams,
  // Ordering / Reservation
  ReservationDto,
  ReservationSummaryDto,
  CreateReservationParams,
  PickupValidationResult,
  // Payment
  PreAuthorizeParams,
  PreAuthorizeResult,
  CaptureResult,
  RefundResult,
  PartnerBalanceDto,
  // Notification
  SendNotificationParams,
  SendBulkNotificationParams,
  ScheduleNotificationParams,
  NotificationPreferencesDto,
  NotificationPreferenceItem,
  UpdateNotificationPreferencesParams,
  // Claims
  ClaimDto,
  // Review
  ReviewDto,
  // Partner
  PartnerDto,
} from './dto/index.js';

// --- Domain Events ---
export type {
  DomainEvent,
  EventMetadata,
  // Catalog events
  BasketPublishedPayload,
  BasketPublishedEvent,
  BasketSoldOutPayload,
  BasketSoldOutEvent,
  BasketStockRestoredPayload,
  BasketStockRestoredEvent,
  BasketCancelledPayload,
  BasketCancelledEvent,
  BasketPickupWindowStartedPayload,
  BasketPickupWindowStartedEvent,
  BasketEndedPayload,
  BasketEndedEvent,
  // Ordering events
  ReservationConfirmedPayload,
  ReservationConfirmedEvent,
  ReservationCancelledByConsumerPayload,
  ReservationCancelledByConsumerEvent,
  ReservationCancelledByPartnerPayload,
  ReservationCancelledByPartnerEvent,
  ReservationReadyPayload,
  ReservationReadyEvent,
  ReservationPickedUpPayload,
  ReservationPickedUpEvent,
  ReservationNoShowPayload,
  ReservationNoShowEvent,
  ReservationExpiredPayload,
  ReservationExpiredEvent,
  // Payment events
  PaymentCapturedPayload,
  PaymentCapturedEvent,
  PaymentRefundedPayload,
  PaymentRefundedEvent,
  PayoutCompletedPayload,
  PayoutCompletedEvent,
  // Partner events
  PartnerActivatedPayload,
  PartnerActivatedEvent,
  PartnerSuspendedPayload,
  PartnerSuspendedEvent,
  PartnerBannedPayload,
  PartnerBannedEvent,
  StoreModificationApprovedPayload,
  StoreModificationApprovedEvent,
  StoreModificationRejectedPayload,
  StoreModificationRejectedEvent,
  // Review & Claims events
  ReviewCreatedPayload,
  ReviewCreatedEvent,
  ClaimOpenedPayload,
  ClaimOpenedEvent,
  ClaimResolvedPayload,
  ClaimResolvedEvent,
  ClaimRejectedPayload,
  ClaimRejectedEvent,
  // Fraud events
  FraudAlertCreatedPayload,
  FraudAlertCreatedEvent,
  FraudAutoSuspendPayload,
  FraudAutoSuspendEvent,
  // Event type
  DomainEventType,
} from './events/index.js';

export { DOMAIN_EVENTS } from './events/index.js';

// --- Errors ---
export { ErrorCode, DomainException } from './errors/index.js';
export type { DomainError } from './errors/index.js';

// --- Ports ---
export type {
  ICatalogService,
  IPaymentService,
  IOrderingService,
  IPartnerService,
  INotificationService,
} from './ports/index.js';

export {
  CATALOG_SERVICE,
  PAYMENT_SERVICE,
  ORDERING_SERVICE,
  PARTNER_SERVICE,
  NOTIFICATION_SERVICE,
} from './ports/index.js';
