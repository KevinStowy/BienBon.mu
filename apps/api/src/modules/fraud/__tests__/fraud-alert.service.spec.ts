// =============================================================================
// FraudAlertService — unit tests (ADR-023)
// =============================================================================
// Tests the alert lifecycle (list, get, investigate, resolve) with mocked Prisma.
// Verifies business rules: only NEW alerts can be investigated, only
// NEW/INVESTIGATED can be resolved, terminal states block further transitions.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FraudAlertService } from '../fraud-alert.service';
import { NotFoundError, BusinessRuleError } from '../../../shared/errors/domain-error';
import { FraudAlertStatus, FraudAlertSeverity } from '@bienbon/shared-types';
import type { ListAlertsQueryDto } from '../dto/list-alerts-query.dto';

// ---------------------------------------------------------------------------
// Prisma enum alignment (service uses Prisma enums internally)
// The Prisma-generated enums match the shared-types enums by name.
// ---------------------------------------------------------------------------

const PrismaFraudAlertStatus = FraudAlertStatus as Record<string, string>;

// ---------------------------------------------------------------------------
// Prisma mock factory
// ---------------------------------------------------------------------------

function makePrismaMock() {
  return {
    fraudAlert: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'alert-001',
    alertType: 'SUSPICIOUS_CANCELLATION',
    actorType: 'CONSUMER',
    actorId: 'consumer-001',
    severity: FraudAlertSeverity.HIGH,
    details: { cancelCount: 5, windowDays: 7 },
    status: FraudAlertStatus.NEW,
    adminComment: null,
    resolvedBy: null,
    ruleId: 'rule-001',
    metricValue: null,
    thresholdValue: null,
    actionTaken: null,
    autoSuspensionId: null,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

function makeListQuery(overrides: Partial<ListAlertsQueryDto> = {}): ListAlertsQueryDto {
  return {
    page: 1,
    limit: 20,
    sort_order: 'desc',
    ...overrides,
  } as ListAlertsQueryDto;
}

// ---------------------------------------------------------------------------
// listAlerts
// ---------------------------------------------------------------------------

describe('FraudAlertService.listAlerts', () => {
  let service: FraudAlertService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    service = new FraudAlertService(prismaMock as never);
  });

  it('returns paginated alerts without filters', async () => {
    prismaMock.fraudAlert.findMany.mockResolvedValueOnce([makeAlert()]);
    prismaMock.fraudAlert.count.mockResolvedValueOnce(1);

    const result = await service.listAlerts(makeListQuery());

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('applies status filter to where clause', async () => {
    prismaMock.fraudAlert.findMany.mockResolvedValueOnce([]);
    prismaMock.fraudAlert.count.mockResolvedValueOnce(0);

    await service.listAlerts(
      makeListQuery({ status: FraudAlertStatus.NEW }),
    );

    expect(prismaMock.fraudAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: FraudAlertStatus.NEW }),
      }),
    );
  });

  it('applies severity filter to where clause', async () => {
    prismaMock.fraudAlert.findMany.mockResolvedValueOnce([]);
    prismaMock.fraudAlert.count.mockResolvedValueOnce(0);

    await service.listAlerts(
      makeListQuery({ severity: FraudAlertSeverity.HIGH }),
    );

    expect(prismaMock.fraudAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ severity: FraudAlertSeverity.HIGH }),
      }),
    );
  });

  it('applies actorType filter to where clause', async () => {
    prismaMock.fraudAlert.findMany.mockResolvedValueOnce([]);
    prismaMock.fraudAlert.count.mockResolvedValueOnce(0);

    await service.listAlerts(makeListQuery({ actorType: 'CONSUMER' }));

    expect(prismaMock.fraudAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ actorType: 'CONSUMER' }),
      }),
    );
  });

  it('uses correct pagination skip/take for page 2', async () => {
    prismaMock.fraudAlert.findMany.mockResolvedValueOnce([]);
    prismaMock.fraudAlert.count.mockResolvedValueOnce(50);

    await service.listAlerts(makeListQuery({ page: 2, limit: 10 }));

    expect(prismaMock.fraudAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });

  it('does not include status in where clause when no filter provided', async () => {
    prismaMock.fraudAlert.findMany.mockResolvedValueOnce([]);
    prismaMock.fraudAlert.count.mockResolvedValueOnce(0);

    await service.listAlerts(makeListQuery());

    const callArg = prismaMock.fraudAlert.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined;
    expect(callArg?.where).not.toHaveProperty('status');
  });
});

// ---------------------------------------------------------------------------
// getAlert
// ---------------------------------------------------------------------------

describe('FraudAlertService.getAlert', () => {
  let service: FraudAlertService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    service = new FraudAlertService(prismaMock as never);
  });

  it('returns the alert when found', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(makeAlert());

    const result = await service.getAlert('alert-001');

    expect(result.id).toBe('alert-001');
    expect(result.status).toBe(FraudAlertStatus.NEW);
  });

  it('throws NotFoundError when alert does not exist', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(null);

    await expect(service.getAlert('nonexistent-alert')).rejects.toThrow(NotFoundError);
  });

  it('error code is FRAUD_ALERT_NOT_FOUND', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(null);

    let error: unknown;
    try {
      await service.getAlert('nonexistent');
    } catch (err) {
      error = err;
    }

    expect((error as NotFoundError).code).toBe('FRAUD_ALERT_NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// investigate
// ---------------------------------------------------------------------------

describe('FraudAlertService.investigate', () => {
  let service: FraudAlertService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    service = new FraudAlertService(prismaMock as never);
  });

  it('transitions NEW alert to INVESTIGATED', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(makeAlert({ status: FraudAlertStatus.NEW }));
    prismaMock.fraudAlert.update.mockResolvedValueOnce(makeAlert({ status: FraudAlertStatus.INVESTIGATED }));

    const result = await service.investigate('alert-001');

    expect(prismaMock.fraudAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'alert-001' },
        data: { status: PrismaFraudAlertStatus.INVESTIGATED },
      }),
    );
    expect(result.status).toBe(FraudAlertStatus.INVESTIGATED);
  });

  it('throws NotFoundError for non-existent alert', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(null);

    await expect(service.investigate('missing-alert')).rejects.toThrow(NotFoundError);
  });

  it('throws BusinessRuleError when alert is already INVESTIGATED (not NEW)', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.INVESTIGATED }),
    );

    await expect(service.investigate('alert-001')).rejects.toThrow(BusinessRuleError);
  });

  it('throws BusinessRuleError when alert is already RESOLVED', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.RESOLVED }),
    );

    await expect(service.investigate('alert-001')).rejects.toThrow(BusinessRuleError);
  });

  it('throws BusinessRuleError when alert is FALSE_POSITIVE (terminal)', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.FALSE_POSITIVE }),
    );

    await expect(service.investigate('alert-001')).rejects.toThrow(BusinessRuleError);
  });

  it('error code is FRAUD_ALERT_INVALID_TRANSITION for non-NEW alert', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.RESOLVED }),
    );

    let error: unknown;
    try {
      await service.investigate('alert-001');
    } catch (err) {
      error = err;
    }

    expect((error as BusinessRuleError).code).toBe('FRAUD_ALERT_INVALID_TRANSITION');
  });
});

// ---------------------------------------------------------------------------
// resolve
// ---------------------------------------------------------------------------

describe('FraudAlertService.resolve', () => {
  let service: FraudAlertService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(() => {
    prismaMock = makePrismaMock();
    service = new FraudAlertService(prismaMock as never);
  });

  it('resolves a NEW alert as RESOLVED', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(makeAlert({ status: FraudAlertStatus.NEW }));
    prismaMock.fraudAlert.update.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.RESOLVED, resolvedBy: 'admin-001' }),
    );

    const result = await service.resolve(
      'alert-001',
      { status: FraudAlertStatus.RESOLVED, adminComment: 'Confirmed abuse.' },
      'admin-001',
    );

    expect(result.status).toBe(FraudAlertStatus.RESOLVED);
  });

  it('resolves an INVESTIGATED alert as FALSE_POSITIVE', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.INVESTIGATED }),
    );
    prismaMock.fraudAlert.update.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.FALSE_POSITIVE }),
    );

    const result = await service.resolve(
      'alert-001',
      { status: FraudAlertStatus.FALSE_POSITIVE },
      'admin-001',
    );

    expect(result.status).toBe(FraudAlertStatus.FALSE_POSITIVE);
  });

  it('persists resolvedBy and adminComment', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(makeAlert({ status: FraudAlertStatus.NEW }));
    prismaMock.fraudAlert.update.mockResolvedValueOnce(makeAlert());

    await service.resolve(
      'alert-001',
      { status: FraudAlertStatus.RESOLVED, adminComment: 'Pattern confirmed.' },
      'admin-007',
    );

    expect(prismaMock.fraudAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolvedBy: 'admin-007',
          adminComment: 'Pattern confirmed.',
        }),
      }),
    );
  });

  it('throws NotFoundError for non-existent alert', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.resolve('missing', { status: FraudAlertStatus.RESOLVED }, 'admin-001'),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws BusinessRuleError when alert is already RESOLVED (already terminal)', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.RESOLVED }),
    );

    await expect(
      service.resolve('alert-001', { status: FraudAlertStatus.RESOLVED }, 'admin-001'),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('throws BusinessRuleError when alert is already FALSE_POSITIVE (already terminal)', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.FALSE_POSITIVE }),
    );

    await expect(
      service.resolve('alert-001', { status: FraudAlertStatus.FALSE_POSITIVE }, 'admin-001'),
    ).rejects.toThrow(BusinessRuleError);
  });

  it('error code is FRAUD_ALERT_ALREADY_RESOLVED for terminal state', async () => {
    prismaMock.fraudAlert.findUnique.mockResolvedValueOnce(
      makeAlert({ status: FraudAlertStatus.RESOLVED }),
    );

    let error: unknown;
    try {
      await service.resolve('alert-001', { status: FraudAlertStatus.FALSE_POSITIVE }, 'admin-001');
    } catch (err) {
      error = err;
    }

    expect((error as BusinessRuleError).code).toBe('FRAUD_ALERT_ALREADY_RESOLVED');
  });
});
