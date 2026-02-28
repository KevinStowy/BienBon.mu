// =============================================================================
// CommissionConfig — domain entity
// =============================================================================
// ADR-007: Commission configuration per scope
// =============================================================================

import { z } from 'zod';

export const CommissionConfigSchema = z.object({
  id: z.string().uuid(),
  /** 'global' | 'partner:<id>' | 'basket_type:<id>' */
  scope: z.string().min(1),
  partnerId: z.string().uuid().nullable(),
  basketTypeId: z.string().uuid().nullable(),
  commissionRate: z.number().min(0).max(1),
  feeMinimum: z.number().nonnegative(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().nullable(),
  createdBy: z.string().min(1),
  createdAt: z.date(),
  notes: z.string().nullable(),
});

export type CommissionConfig = z.infer<typeof CommissionConfigSchema>;

/**
 * Returns true if the config is active at the given date.
 */
export function isConfigActive(config: CommissionConfig, at: Date): boolean {
  if (at < config.effectiveFrom) return false;
  if (config.effectiveTo && at > config.effectiveTo) return false;
  return true;
}
