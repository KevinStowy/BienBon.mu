// =============================================================================
// Shared Enums — mirrored from Prisma schema for cross-BC communication
// =============================================================================

// --- Identity & Access ---

export enum Role {
  CONSUMER = 'CONSUMER',
  PARTNER = 'PARTNER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DELETED = 'DELETED',
}

// --- Partner ---

export enum PartnerStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  BANNED = 'BANNED',
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum StoreType {
  BAKERY = 'BAKERY',
  RESTAURANT = 'RESTAURANT',
  SUPERMARKET = 'SUPERMARKET',
  CAFE = 'CAFE',
  HOTEL = 'HOTEL',
  DELI = 'DELI',
  OTHER = 'OTHER',
}

export enum StoreRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum RegistrationChannel {
  WEB_FORM = 'WEB_FORM',
  ADMIN_INVITE = 'ADMIN_INVITE',
  PARTNER_REFERRAL = 'PARTNER_REFERRAL',
}

// --- Catalog ---

export enum BasketStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SOLD_OUT = 'SOLD_OUT',
  PICKUP_WINDOW = 'PICKUP_WINDOW',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum RecurringTemplateStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

// --- Ordering ---

export enum ReservationStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  NO_SHOW = 'NO_SHOW',
  CANCELLED_CONSUMER = 'CANCELLED_CONSUMER',
  CANCELLED_PARTNER = 'CANCELLED_PARTNER',
  EXPIRED = 'EXPIRED',
}

export enum CancellationReason {
  CONSUMER_CHANGED_MIND = 'CONSUMER_CHANGED_MIND',
  CONSUMER_DUPLICATE = 'CONSUMER_DUPLICATE',
  CONSUMER_OTHER = 'CONSUMER_OTHER',
  PARTNER_SOLD_OUT = 'PARTNER_SOLD_OUT',
  PARTNER_STORE_CLOSED = 'PARTNER_STORE_CLOSED',
  PARTNER_OTHER = 'PARTNER_OTHER',
  SYSTEM_PAYMENT_FAILED = 'SYSTEM_PAYMENT_FAILED',
  SYSTEM_EXPIRED = 'SYSTEM_EXPIRED',
}

// --- Payment ---

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  MCB_JUICE = 'MCB_JUICE',
  BLINK = 'BLINK',
  MYT_MONEY = 'MYT_MONEY',
}

export enum PaymentType {
  PRE_AUTH = 'PRE_AUTH',
  CAPTURE = 'CAPTURE',
  REFUND = 'REFUND',
  VOID = 'VOID',
}

export enum PayoutStatementStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  VALIDATED = 'VALIDATED',
  PAYOUT_INITIATED = 'PAYOUT_INITIATED',
  PAID = 'PAID',
  ERROR = 'ERROR',
  DEFERRED = 'DEFERRED',
}

// --- Claims ---

export enum ClaimStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ResolutionType {
  FULL_REFUND = 'FULL_REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  STORE_CREDIT = 'STORE_CREDIT',
  REJECTED = 'REJECTED',
}

// --- Notifications ---

export enum NotificationType {
  FAVORITE_NEW_BASKET = 'FAVORITE_NEW_BASKET',
  RESERVATION_CONFIRMED = 'RESERVATION_CONFIRMED',
  PICKUP_REMINDER = 'PICKUP_REMINDER',
  PARTNER_CANCELLED = 'PARTNER_CANCELLED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  NO_SHOW = 'NO_SHOW',
  CLAIM_RESOLVED = 'CLAIM_RESOLVED',
  REFERRAL_VALIDATED = 'REFERRAL_VALIDATED',
  BADGE_EARNED = 'BADGE_EARNED',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}

// --- Fraud ---

export enum FraudAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum FraudAlertStatus {
  NEW = 'NEW',
  INVESTIGATED = 'INVESTIGATED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  RESOLVED = 'RESOLVED',
}

export enum SuspensionStatus {
  ACTIVE = 'ACTIVE',
  LIFTED = 'LIFTED',
  ESCALATED_TO_BAN = 'ESCALATED_TO_BAN',
}

// --- Referrals ---

export enum ReferralStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// --- Ledger ---

export enum LedgerAccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

// --- Reconciliation ---

export enum ReconAlertType {
  BALANCE_MISMATCH = 'BALANCE_MISMATCH',
  TRANSACTION_MISSING = 'TRANSACTION_MISSING',
  TRANSACTION_EXTRA = 'TRANSACTION_EXTRA',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  STATUS_MISMATCH = 'STATUS_MISMATCH',
  LEDGER_IMBALANCE = 'LEDGER_IMBALANCE',
}

export enum ReconAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
