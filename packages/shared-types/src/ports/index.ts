// =============================================================================
// Port Interfaces — public contracts for cross-BC communication
// =============================================================================

export type { ICatalogService } from './catalog.port.js';
export { CATALOG_SERVICE } from './catalog.port.js';

export type { IPaymentService } from './payment.port.js';
export { PAYMENT_SERVICE } from './payment.port.js';

export type { IOrderingService } from './ordering.port.js';
export { ORDERING_SERVICE } from './ordering.port.js';

export type { IPartnerService } from './partner.port.js';
export { PARTNER_SERVICE } from './partner.port.js';

export type { INotificationService } from './notification.port.js';
export { NOTIFICATION_SERVICE } from './notification.port.js';
