import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentOrchestratorService } from '../../application/services/payment-orchestrator.service';
import type { PaymentGatewayPort } from '../../ports/payment-gateway.port';
import type { PaymentTransactionRepositoryPort } from '../../ports/payment-transaction.repository.port';
import type { LedgerService } from '../../application/services/ledger.service';
import type { CommissionService } from '../../application/services/commission.service';
import { PaymentStatus, PaymentType, PaymentMethod } from '@bienbon/shared-types';
import type { PaymentTransactionRecord } from '../../ports/payment-transaction.repository.port';
import type { PeachPaymentResponse } from '../../adapters/peach/peach-payments.types';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

const SUCCESS_RESPONSE: PeachPaymentResponse = {
  id: '8ac7a4a1test1234',
  result: { code: '000.100.110', description: 'Success' },
  paymentType: 'PA',
  amount: '200.00',
  currency: 'MUR',
  timestamp: new Date().toISOString(),
};

const FAILURE_RESPONSE: PeachPaymentResponse = {
  id: '8ac7a4a1fail5678',
  result: { code: '800.100.153', description: 'Declined' },
  paymentType: 'PA',
  amount: '200.00',
  currency: 'MUR',
  timestamp: new Date().toISOString(),
};

function makeCaptureTx(overrides: Partial<PaymentTransactionRecord> = {}): PaymentTransactionRecord {
  return {
    id: 'cap-tx-001',
    reservationId: 'res-001',
    type: PaymentType.CAPTURE,
    status: PaymentStatus.SUCCEEDED,
    amount: 200,
    currency: 'MUR',
    paymentMethod: PaymentMethod.CARD,
    providerTxId: 'peach-tx-001',
    providerStatus: '000.100.110',
    commissionRate: 0.25,
    commissionAmount: 50,
    partnerNetAmount: 150,
    feeMinimumApplied: false,
    consumerId: 'consumer-001',
    partnerId: 'partner-001',
    parentTxId: 'preauth-tx-001',
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePreAuthTx(overrides: Partial<PaymentTransactionRecord> = {}): PaymentTransactionRecord {
  return {
    id: 'preauth-tx-001',
    reservationId: 'res-001',
    type: PaymentType.PRE_AUTH,
    status: PaymentStatus.SUCCEEDED,
    amount: 200,
    currency: 'MUR',
    paymentMethod: PaymentMethod.CARD,
    providerTxId: 'peach-preauth-001',
    providerStatus: '000.100.110',
    commissionRate: null,
    commissionAmount: null,
    partnerNetAmount: null,
    feeMinimumApplied: false,
    consumerId: 'consumer-001',
    partnerId: 'partner-001',
    parentTxId: null,
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PaymentOrchestratorService', () => {
  let service: PaymentOrchestratorService;
  let gateway: PaymentGatewayPort;
  let txRepo: PaymentTransactionRepositoryPort;
  let ledgerService: LedgerService;
  let commissionService: CommissionService;
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    gateway = {
      preAuthorize: vi.fn().mockResolvedValue(SUCCESS_RESPONSE),
      capture: vi.fn().mockResolvedValue({ ...SUCCESS_RESPONSE, paymentType: 'CP' }),
      refund: vi.fn().mockResolvedValue({ ...SUCCESS_RESPONSE, paymentType: 'RF' }),
      reverse: vi.fn().mockResolvedValue({ ...SUCCESS_RESPONSE, paymentType: 'RV' }),
    } as unknown as PaymentGatewayPort;

    txRepo = {
      create: vi.fn().mockResolvedValue(makePreAuthTx()),
      findById: vi.fn().mockResolvedValue(makePreAuthTx()),
      findByReservationId: vi.fn().mockResolvedValue([makePreAuthTx()]),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findByProviderTxId: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...makePreAuthTx(), id, ...data })),
      findCapturedByReservationId: vi.fn().mockResolvedValue(makeCaptureTx()),
    } as unknown as PaymentTransactionRepositoryPort;

    ledgerService = {
      postCaptureJournal: vi.fn().mockResolvedValue([]),
      postRefundJournal: vi.fn().mockResolvedValue([]),
      getPartnerBalance: vi.fn().mockResolvedValue({ partnerId: 'p1', balance: 0, currency: 'MUR' }),
    } as unknown as LedgerService;

    commissionService = {
      calculateForPartner: vi.fn().mockResolvedValue({
        commissionAmount: 50,
        netPartnerAmount: 150,
        feeMinimumApplied: false,
        effectiveRate: 0.25,
        commissionRate: 0.25,
        feeMinimum: 50,
        configId: null,
      }),
      resolveCommissionConfig: vi.fn(),
    } as unknown as CommissionService;

    eventEmitter = { emit: vi.fn() };

    service = new PaymentOrchestratorService(
      gateway,
      txRepo,
      ledgerService,
      commissionService,
      eventEmitter as never,
    );
  });

  // -------------------------------------------------------------------------
  // preAuthorize (IPaymentService)
  // -------------------------------------------------------------------------

  describe('preAuthorize', () => {
    it('creates a pending transaction and calls gateway', async () => {
      const result = await service.preAuthorize({
        orderId: 'res-001',
        consumerId: 'consumer-001',
        amount: 200,
        currency: 'MUR',
        paymentMethod: PaymentMethod.CARD,
      });

      expect(txRepo.create).toHaveBeenCalledOnce();
      expect(gateway.preAuthorize).toHaveBeenCalledOnce();
      expect(result.success).toBe(true);
    });

    it('returns failure when gateway declines', async () => {
      vi.mocked(gateway.preAuthorize).mockResolvedValueOnce(FAILURE_RESPONSE);

      const result = await service.preAuthorize({
        orderId: 'res-001',
        consumerId: 'consumer-001',
        amount: 200,
        currency: 'MUR',
        paymentMethod: PaymentMethod.CARD,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(PaymentStatus.FAILED);
    });
  });

  // -------------------------------------------------------------------------
  // capture (IPaymentService)
  // -------------------------------------------------------------------------

  describe('capture', () => {
    it('finds pre-auth, calls capture, posts ledger journal, emits event', async () => {
      await service.capture('res-001');

      expect(gateway.capture).toHaveBeenCalledOnce();
      expect(commissionService.calculateForPartner).toHaveBeenCalledWith('partner-001', 200);
      expect(ledgerService.postCaptureJournal).toHaveBeenCalledOnce();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.transaction.captured',
        expect.objectContaining({ eventType: 'payment.transaction.captured' }),
      );
    });

    it('throws when no pre-auth transaction found', async () => {
      vi.mocked(txRepo.findByReservationId).mockResolvedValueOnce([]);

      await expect(service.capture('res-001')).rejects.toThrow(
        'Payment transaction',
      );
    });
  });

  // -------------------------------------------------------------------------
  // refund (IPaymentService)
  // -------------------------------------------------------------------------

  describe('refund', () => {
    it('finds capture, calls refund, posts ledger, emits event', async () => {
      const result = await service.refund('res-001', 200);

      expect(gateway.refund).toHaveBeenCalledOnce();
      expect(ledgerService.postRefundJournal).toHaveBeenCalledOnce();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.transaction.refunded',
        expect.objectContaining({ eventType: 'payment.transaction.refunded' }),
      );
      expect(result.success).toBe(true);
      expect(result.refundedAmount).toBe(200);
    });

    it('throws when refund amount exceeds captured amount', async () => {
      await expect(service.refund('res-001', 999)).rejects.toThrow(
        'Refund amount (999) exceeds captured amount (200)',
      );
    });

    it('throws when no capture transaction found', async () => {
      vi.mocked(txRepo.findCapturedByReservationId).mockResolvedValueOnce(null);

      await expect(service.refund('res-001', 100)).rejects.toThrow(
        'capture for reservation res-001',
      );
    });
  });

  // -------------------------------------------------------------------------
  // reversal (IPaymentService)
  // -------------------------------------------------------------------------

  describe('reversal', () => {
    it('calls gateway.reverse and updates transaction status to CANCELLED', async () => {
      vi.mocked(txRepo.findByReservationId).mockResolvedValueOnce([makePreAuthTx()]);

      await service.reversal('res-001');

      expect(gateway.reverse).toHaveBeenCalledOnce();
      expect(txRepo.update).toHaveBeenCalledWith(
        'preauth-tx-001',
        expect.objectContaining({ status: PaymentStatus.CANCELLED }),
      );
    });

    it('does nothing when no pre-auth exists', async () => {
      vi.mocked(txRepo.findByReservationId).mockResolvedValueOnce([]);

      await service.reversal('res-001');

      expect(gateway.reverse).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // authorizePayment (extended command)
  // -------------------------------------------------------------------------

  describe('authorizePayment', () => {
    it('checks idempotency key before processing', async () => {
      vi.mocked(txRepo.findByIdempotencyKey).mockResolvedValueOnce(makePreAuthTx());

      await expect(
        service.authorizePayment({
          reservationId: 'res-001',
          consumerId: 'consumer-001',
          partnerId: 'partner-001',
          amount: 200,
          currency: 'MUR',
          paymentMethod: PaymentMethod.CARD,
          paymentMethodToken: 'tok-abc',
          idempotencyKey: 'idem-key-001',
        }),
      ).rejects.toThrow('idempotency key');
    });
  });
});
