// =============================================================================
// IPartnerService — Port for Partner bounded context (BC-3)
// =============================================================================
// Used by: Catalog (validate store is active), Ordering (get store info)
// Communication type: synchronous call
// See: ADR-024 section 3.2 (BC-3) and ADR-018 (approval workflow)
// =============================================================================

import type {
  StoreDto,
  UpdateStoreParams,
} from '../dto/index.js';

export interface IPartnerService {
  /**
   * Get a store by ID with full details.
   * Returns null if the store does not exist.
   */
  getStore(storeId: string): Promise<StoreDto | null>;

  /**
   * Check if a store is currently active.
   * Used by Catalog before publishing baskets.
   */
  isStoreActive(storeId: string): Promise<boolean>;

  /**
   * Get all stores managed by a partner.
   */
  getStoresByPartner(partnerId: string): Promise<StoreDto[]>;

  /**
   * Update store information.
   * Depending on which fields are changed, may create a modification request
   * requiring admin approval (ADR-018).
   */
  updateStore(storeId: string, data: UpdateStoreParams): Promise<StoreDto>;
}

/** Injection token for IPartnerService */
export const PARTNER_SERVICE = Symbol('IPartnerService');
