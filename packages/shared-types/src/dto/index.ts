// =============================================================================
// Shared DTOs — data transfer objects for cross-BC communication
// =============================================================================

import type {
  BasketStatus,
  ClaimStatus,
  NotificationChannel,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PartnerStatus,
  ReservationStatus,
  ResolutionType,
  StoreStatus,
  StoreType,
} from '../enums/index.js';

// =============================================================================
// Pagination
// =============================================================================

export interface PaginationDto {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =============================================================================
// Catalog DTOs
// =============================================================================

export interface BasketDto {
  id: string;
  storeId: string;
  storeName: string;
  storeType: StoreType;
  title: string;
  description: string | null;
  originalPrice: number;
  sellingPrice: number;
  quantity: number;
  stock: number;
  categoryId: string;
  photoUrl: string | null;
  pickupStart: string;
  pickupEnd: string;
  status: BasketStatus;
  tags: TagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface BasketSummaryDto {
  id: string;
  storeId: string;
  storeName: string;
  storeType: StoreType;
  title: string;
  originalPrice: number;
  sellingPrice: number;
  stock: number;
  photoUrl: string | null;
  pickupStart: string;
  pickupEnd: string;
  status: BasketStatus;
  distance: number | null;
}

export interface TagDto {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string | null;
}

export interface AvailableBasketsFilter {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  storeId?: string;
  categoryId?: string;
  tagSlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  pickupAfter?: string;
  pickupBefore?: string;
}

export interface StockOperationResult {
  success: boolean;
  remainingStock: number;
}

// =============================================================================
// Partner / Store DTOs
// =============================================================================

export interface StoreDto {
  id: string;
  name: string;
  type: StoreType;
  address: string;
  city: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  phone: string | null;
  avgRating: number;
  totalReviews: number;
  status: StoreStatus;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreSummaryDto {
  id: string;
  name: string;
  type: StoreType;
  city: string;
  avgRating: number;
  totalReviews: number;
  status: StoreStatus;
  photoUrl: string | null;
}

export interface UpdateStoreParams {
  name?: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

// =============================================================================
// Ordering / Reservation DTOs
// =============================================================================

export interface ReservationDto {
  id: string;
  basketId: string;
  consumerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: ReservationStatus;
  qrCode: string;
  pinCode: string;
  expiresAt: string | null;
  confirmedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationSummaryDto {
  id: string;
  basketId: string;
  basketTitle: string;
  storeName: string;
  storeId: string;
  quantity: number;
  totalPrice: number;
  status: ReservationStatus;
  pickupStart: string;
  pickupEnd: string;
  createdAt: string;
}

export interface CreateReservationParams {
  basketId: string;
  consumerId: string;
  quantity: number;
  paymentMethod: PaymentMethod;
}

export interface PickupValidationResult {
  success: boolean;
  reservationId: string;
  status: ReservationStatus;
  errorCode?: string;
  errorMessage?: string;
}

// =============================================================================
// Payment DTOs
// =============================================================================

export interface PreAuthorizeParams {
  orderId: string;
  consumerId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
}

export interface PreAuthorizeResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  providerTxId: string | null;
  errorCode?: string;
  errorMessage?: string;
}

export interface CaptureResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  capturedAmount: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface RefundResult {
  success: boolean;
  transactionId: string;
  status: PaymentStatus;
  refundedAmount: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface PartnerBalanceDto {
  partnerId: string;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  lastPayoutDate: string | null;
  lastPayoutAmount: number | null;
}

// =============================================================================
// Notification DTOs
// =============================================================================

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channels: NotificationChannel[];
  data?: Record<string, string>;
  deepLink?: string;
}

export interface SendBulkNotificationParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  channels: NotificationChannel[];
  data?: Record<string, string>;
  deepLink?: string;
}

export interface ScheduleNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channels: NotificationChannel[];
  scheduledAt: string;
  data?: Record<string, string>;
  deepLink?: string;
}

export interface NotificationPreferencesDto {
  userId: string;
  preferences: NotificationPreferenceItem[];
}

export interface NotificationPreferenceItem {
  type: NotificationType;
  channels: {
    channel: NotificationChannel;
    enabled: boolean;
  }[];
}

export interface UpdateNotificationPreferencesParams {
  preferences: NotificationPreferenceItem[];
}

// =============================================================================
// Claims DTOs
// =============================================================================

export interface ClaimDto {
  id: string;
  reservationId: string;
  consumerId: string;
  reasonSlug: string;
  description: string;
  status: ClaimStatus;
  resolutionType: ResolutionType | null;
  resolutionAmount: number | null;
  adminComment: string | null;
  photoUrls: string[];
  createdAt: string;
  resolvedAt: string | null;
}

// =============================================================================
// Review DTOs
// =============================================================================

export interface ReviewDto {
  id: string;
  reservationId: string;
  consumerId: string;
  partnerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

// =============================================================================
// Partner Status DTOs
// =============================================================================

export interface PartnerDto {
  id: string;
  userId: string;
  status: PartnerStatus;
  statusReason: string | null;
  stores: StoreSummaryDto[];
  createdAt: string;
}
