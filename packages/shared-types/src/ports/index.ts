// =============================================================================
// Port Interfaces — public contracts for cross-BC communication
// =============================================================================

export type { ICatalogService } from './catalog.port';
export { CATALOG_SERVICE } from './catalog.port';

export type { IPaymentService } from './payment.port';
export { PAYMENT_SERVICE } from './payment.port';

export type { IOrderingService } from './ordering.port';
export { ORDERING_SERVICE } from './ordering.port';

export type { IPartnerService } from './partner.port';
export { PARTNER_SERVICE } from './partner.port';

export type { INotificationService } from './notification.port';
export { NOTIFICATION_SERVICE } from './notification.port';
