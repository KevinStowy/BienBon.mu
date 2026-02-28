// =============================================================================
// CommissionService — resolves commission config and calculates amounts
// =============================================================================
// ADR-007: Commission config resolution (scope priority: partner > global)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { calculateCommission } from '../../domain/rules/commission-calculator';
import type { CommissionResult } from '../../domain/rules/commission-calculator';

/** Default commission config (fallback when no config found) */
const DEFAULT_COMMISSION_RATE = 0.25; // 25%
const DEFAULT_FEE_MINIMUM = 50; // Rs 50

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the effective commission config for a given partner.
   *
   * Priority (highest to lowest):
   * 1. Partner-specific config (scope = 'partner')
   * 2. Global config (scope = 'global')
   * 3. Hardcoded defaults
   */
  async resolveCommissionConfig(partnerId: string): Promise<{
    commissionRate: number;
    feeMinimum: number;
    configId: string | null;
  }> {
    const now = new Date();

    // Try partner-specific config first
    const partnerConfig = await this.prisma.commissionConfig.findFirst({
      where: {
        partnerId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (partnerConfig) {
      return {
        commissionRate: Number(partnerConfig.commissionRate),
        feeMinimum: Number(partnerConfig.feeMinimum),
        configId: partnerConfig.id,
      };
    }

    // Fall back to global config
    const globalConfig = await this.prisma.commissionConfig.findFirst({
      where: {
        scope: 'global',
        partnerId: null,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (globalConfig) {
      return {
        commissionRate: Number(globalConfig.commissionRate),
        feeMinimum: Number(globalConfig.feeMinimum),
        configId: globalConfig.id,
      };
    }

    // Hardcoded defaults
    this.logger.warn(
      `No commission config found for partner ${partnerId}. Using defaults.`,
    );
    return {
      commissionRate: DEFAULT_COMMISSION_RATE,
      feeMinimum: DEFAULT_FEE_MINIMUM,
      configId: null,
    };
  }

  /**
   * Calculates commission amounts for a given price and partner.
   */
  async calculateForPartner(
    partnerId: string,
    price: number,
  ): Promise<CommissionResult & { configId: string | null; commissionRate: number; feeMinimum: number }> {
    const { commissionRate, feeMinimum, configId } = await this.resolveCommissionConfig(partnerId);
    const result = calculateCommission(price, commissionRate, feeMinimum);

    return { ...result, configId, commissionRate, feeMinimum };
  }
}
