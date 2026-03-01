// ---- API Response Types ----
// Typed responses matching NestJS backend entities

export type PartnerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'BANNED'
export type PartnerType = 'RESTAURANT' | 'BAKERY' | 'GROCERY' | 'CAFE' | 'PATISSERIE' | 'TRAITEUR'
export type PartnerChannel = 'WEB' | 'KIT_TERRAIN' | 'ADMIN_MANUAL'

export interface Partner {
  id: string
  storeName: string
  type: PartnerType
  managerFirstName: string
  managerLastName: string
  managerEmail: string
  managerPhone: string
  status: PartnerStatus
  channel: PartnerChannel
  submittedAt: string
  approvedAt: string | null
  suspendedAt: string | null
  bannedAt: string | null
  address: string
  brn: string
  description: string
  photos: string[]
  openingHours: string
  basketsTotal: number
  basketsSold: number
  basketsSaved: number
  revenueTotal: number
  commissionRate: number | null
  commissionFixed: number | null
  feeMinimum: number | null
  useGlobalCommission: boolean
  rating: number
  reviewCount: number
  claimsCount: number
  noShowRate: number
  cancellationsCount: number
}

export interface PartnerModification {
  id: string
  partnerId: string
  partnerName: string
  fields: ModificationField[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL'
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

export interface ModificationField {
  field: string
  label: string
  oldValue: string
  newValue: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectReason?: string
}

export interface PriceHistoryEntry {
  id: string
  partnerId: string
  basketTitle: string
  publishedAt: string
  originalValue: number
  salePrice: number
  discountRate: number
  flagged: boolean
}

export type ConsumerStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED'

export interface Consumer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  profilePhoto: string | null
  registeredAt: string
  registrationMethod: 'EMAIL' | 'PHONE' | 'GOOGLE' | 'FACEBOOK' | 'APPLE'
  dietaryPreferences: string[]
  status: ConsumerStatus
  reservationsCount: number
  pickupsValidated: number
  noShowCount: number
  noShowRate: number
  openClaimsCount: number
  resolvedClaimsCount: number
  totalSpent: number
  referralsSent: number
  referralsAccepted: number
  favoritePartners: string[]
}

export type ClaimType = 'MISSING_ITEM' | 'QUALITY_ISSUE' | 'WRONG_BASKET' | 'NO_SHOW_DISPUTE'
export type ClaimStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
export type ResolutionType = 'FULL_REFUND' | 'PARTIAL_REFUND' | 'REJECTION'

export interface Claim {
  id: string
  consumerId: string
  consumerName: string
  consumerEmail: string
  consumerClaimsCount: number
  consumerPickupsCount: number
  partnerId: string
  partnerName: string
  partnerClaimsCount: number
  partnerPickupsCount: number
  partnerRating: number
  reservationId: string
  reservationDate: string
  basketTitle: string
  basketOriginalValue: number
  basketSalePrice: number
  pickupDate: string | null
  type: ClaimType
  status: ClaimStatus
  description: string
  photos: string[]
  amount: number
  createdAt: string
  updatedAt: string
  assignedTo: string | null
  resolution: ClaimResolution | null
  ageHours: number
}

export interface ClaimResolution {
  type: ResolutionType
  amount: number | null
  comment: string
  resolvedBy: string
  resolvedAt: string
}

export interface Review {
  id: string
  consumerId: string
  consumerName: string
  partnerId: string
  partnerName: string
  rating: number
  createdAt: string
  flagged: boolean
  flagReason: string | null
}

export type AuditCategory =
  | 'AUTH'
  | 'CONSUMER'
  | 'PARTNER'
  | 'RESERVATION'
  | 'PICKUP'
  | 'BASKET'
  | 'PAYMENT'
  | 'CLAIM'
  | 'MODERATION'
  | 'ADMIN'
  | 'FINANCE'
  | 'SETTINGS'

export interface AuditEntry {
  id: string
  userId: string
  userIdDisplay: string
  userName: string
  userEmail: string
  userRole: 'CONSUMER' | 'PARTNER' | 'ADMIN' | 'SUPER_ADMIN' | 'SYSTEM'
  action: string
  category: AuditCategory
  summary: string
  details: string
  dataBefore: Record<string, unknown> | null
  dataAfter: Record<string, unknown> | null
  relatedEntities: RelatedEntity[]
  ip: string
  userAgent: string
  createdAt: string
}

export interface RelatedEntity {
  type: 'PARTNER' | 'CONSUMER' | 'RESERVATION' | 'BASKET' | 'CLAIM' | 'PAYOUT'
  id: string
  label: string
}

export type FraudAlertType =
  | 'MULTIPLE_ACCOUNTS'
  | 'SYSTEMATIC_CLAIMS'
  | 'RECURRING_NO_SHOWS'
  | 'REFUND_ABUSE'
  | 'RESERVATION_CANCEL_PATTERN'
  | 'VALUE_INFLATION'
  | 'FREQUENT_CANCELLATIONS'
  | 'HIGH_CLAIM_RATE'
  | 'INCONSISTENT_HOURS'
  | 'PRICE_VOLATILITY'

export type FraudAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type FraudAlertStatus = 'NEW' | 'INVESTIGATING' | 'FALSE_POSITIVE' | 'RESOLVED'

export interface FraudAlert {
  id: string
  type: FraudAlertType
  severity: FraudAlertSeverity
  entityType: 'CONSUMER' | 'PARTNER'
  entityId: string
  entityName: string
  description: string
  dataMetrics: Record<string, number | string>
  status: FraudAlertStatus
  assignedTo: string | null
  comment: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface DuplicateAccount {
  id: string
  accounts: DuplicateAccountEntry[]
  detectionCriteria: 'EMAIL' | 'PHONE' | 'DEVICE' | 'IP'
  confidenceScore: number
  status: 'PENDING' | 'MERGED' | 'FALSE_POSITIVE'
  createdAt: string
}

export interface DuplicateAccountEntry {
  userId: string
  name: string
  email: string
  phone: string
  registeredAt: string
  reservationsCount: number
}

export interface ThresholdAlert {
  id: string
  type: string
  description: string
  currentValue: number
  threshold: number
  period: string
  status: 'ACTIVE' | 'ACKNOWLEDGED'
  acknowledgedBy: string | null
  acknowledgedComment: string | null
  createdAt: string
}

export interface ThresholdRule {
  id: string
  name: string
  description: string
  type: string
  thresholdValue: number
  windowMinutes: number
  enabled: boolean
  notifyEmail: boolean
  notifyPush: boolean
}

export interface CommissionConfig {
  globalRate: number
  feeMinimum: number
  minDiscountRatio: number
  lastModifiedAt: string
  lastModifiedBy: string
}

export interface PayoutStatement {
  id: string
  partnerId: string
  partnerName: string
  partnerAddress: string
  partnerBrn: string
  period: string
  transactions: PayoutTransaction[]
  totalGrossSales: number
  totalCommission: number
  netPayout: number
  status: 'PENDING' | 'PAID' | 'ERROR'
  paidAt: string | null
  scheduledPayDate: string
}

export interface PayoutTransaction {
  id: string
  date: string
  basketRef: string
  quantity: number
  saleAmount: number
  commissionRate: number
  commissionAmount: number
  feeMinApplied: boolean
}

export interface RevenueOverview {
  totalRevenue: number
  totalCommission: number
  avgMargin: number
  totalTransactions: number
  avgTransactionAmount: number
  totalRefunds: number
}

export interface RevenueByPartner {
  partnerId: string
  partnerName: string
  revenue: number
  transactions: number
  commission: number
}

export interface Category {
  id: string
  icon: string
  nameFr: string
  nameEn: string
  nameKr: string
  basketCount: number
  status: 'ACTIVE' | 'INACTIVE'
}

export interface Tag {
  id: string
  icon: string
  description: string
  nameFr: string
  nameEn: string
  nameKr: string
  basketCount: number
  consumerCount: number
  isSystem: boolean
  status: 'ACTIVE' | 'INACTIVE'
}

export interface DashboardKpis {
  totalConsumers: number
  consumersGrowth: number
  activePartners: number
  partnersGrowth: number
  basketsSaved: number
  basketsGrowth: number
  totalRevenue: number
  revenueGrowth: number
  commissionEarned: number
  commissionGrowth: number
  reservationsToday: number
  reservationsTodayCompleted: number
  reservationsTodayInProgress: number
  reservationsGrowth: number
  openClaims: number
  claimsGrowth: number
  claimsOver24h: number
  claimsOver48h: number
}

export interface DailyFocus {
  basketsPublished: number
  basketsPublishedYesterday: number
  basketsPublishedLastWeek: number
  reservations: number
  reservationsYesterday: number
  reservationsLastWeek: number
  pickupsCompleted: number
  pickupsYesterday: number
  pickupsLastWeek: number
  dailyRevenue: number
  dailyRevenueYesterday: number
  dailyRevenueLastWeek: number
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  baskets: number
  commission: number
}

export interface ActivityEvent {
  id: string
  type: string
  actor: string
  description: string
  timestamp: string
  category: 'PARTNER' | 'CONSUMER' | 'CLAIM' | 'FINANCE' | 'FRAUD'
}

export type PeriodFilter =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'
