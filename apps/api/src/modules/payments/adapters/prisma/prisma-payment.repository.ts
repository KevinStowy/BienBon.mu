// =============================================================================
// PrismaPaymentRepository — Prisma adapter for PaymentTransactionRepositoryPort
// =============================================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentTransactionRepositoryPort } from '../../ports/payment-transaction.repository.port';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  PaymentTransactionRecord,
} from '../../ports/payment-transaction.repository.port';
import type { PaymentType, PaymentStatus, PaymentMethod } from '@bienbon/shared-types';
import type { Prisma } from '../../../../generated/prisma/client';

@Injectable()
export class PrismaPaymentRepository extends PaymentTransactionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(input: CreateTransactionInput): Promise<PaymentTransactionRecord> {
    const record = await this.prisma.paymentTransaction.create({
      data: {
        id: input.id,
        reservationId: input.reservationId,
        type: input.type,
        status: input.status,
        amount: input.amount,
        currency: input.currency,
        paymentMethod: input.paymentMethod,
        providerTxId: input.providerTxId ?? null,
        providerStatus: input.providerStatus ?? null,
        consumerId: input.consumerId ?? null,
        partnerId: input.partnerId ?? null,
        parentTxId: input.parentTxId ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });

    return this.mapRecord(record);
  }

  async findById(id: string): Promise<PaymentTransactionRecord | null> {
    const record = await this.prisma.paymentTransaction.findUnique({
      where: { id },
    });
    return record ? this.mapRecord(record) : null;
  }

  async findByReservationId(reservationId: string): Promise<PaymentTransactionRecord[]> {
    const records = await this.prisma.paymentTransaction.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => this.mapRecord(r));
  }

  async findByIdempotencyKey(key: string): Promise<PaymentTransactionRecord | null> {
    const record = await this.prisma.paymentTransaction.findUnique({
      where: { idempotencyKey: key },
    });
    return record ? this.mapRecord(record) : null;
  }

  async findByProviderTxId(providerTxId: string): Promise<PaymentTransactionRecord | null> {
    const record = await this.prisma.paymentTransaction.findFirst({
      where: { providerTxId },
    });
    return record ? this.mapRecord(record) : null;
  }

  async update(id: string, input: UpdateTransactionInput): Promise<PaymentTransactionRecord> {
    const data: Prisma.PaymentTransactionUpdateInput = {};

    if (input.status !== undefined) data.status = input.status;
    if (input.providerTxId !== undefined) data.providerTxId = input.providerTxId;
    if (input.providerStatus !== undefined) data.providerStatus = input.providerStatus;
    if (input.commissionRate !== undefined) data.commissionRate = input.commissionRate;
    if (input.commissionAmount !== undefined) data.commissionAmount = input.commissionAmount;
    if (input.partnerNetAmount !== undefined) data.partnerNetAmount = input.partnerNetAmount;
    if (input.feeMinimumApplied !== undefined) data.feeMinimumApplied = input.feeMinimumApplied;
    if (input.metadata !== undefined) data.metadata = input.metadata as Prisma.InputJsonValue;

    const record = await this.prisma.paymentTransaction.update({
      where: { id },
      data,
    });

    return this.mapRecord(record);
  }

  async findCapturedByReservationId(reservationId: string): Promise<PaymentTransactionRecord | null> {
    const record = await this.prisma.paymentTransaction.findFirst({
      where: {
        reservationId,
        type: 'CAPTURE',
        status: 'SUCCEEDED',
      },
    });
    return record ? this.mapRecord(record) : null;
  }

  // ---------------------------------------------------------------------------
  // Private mapper
  // ---------------------------------------------------------------------------

  private mapRecord(record: {
    id: string;
    reservationId: string;
    type: string;
    status: string;
    amount: { toNumber: () => number } | number;
    currency: string;
    paymentMethod: string;
    providerTxId: string | null;
    providerStatus: string | null;
    commissionRate: { toNumber: () => number } | number | null;
    commissionAmount: { toNumber: () => number } | number | null;
    partnerNetAmount: { toNumber: () => number } | number | null;
    feeMinimumApplied: boolean;
    consumerId: string | null;
    partnerId: string | null;
    parentTxId: string | null;
    idempotencyKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentTransactionRecord {
    const toNumber = (v: { toNumber: () => number } | number | null): number | null => {
      if (v === null) return null;
      return typeof v === 'object' ? v.toNumber() : v;
    };

    return {
      id: record.id,
      reservationId: record.reservationId,
      type: record.type as PaymentType,
      status: record.status as PaymentStatus,
      amount: toNumber(record.amount as { toNumber: () => number } | number)!,
      currency: record.currency,
      paymentMethod: record.paymentMethod as PaymentMethod,
      providerTxId: record.providerTxId,
      providerStatus: record.providerStatus,
      commissionRate: toNumber(record.commissionRate as { toNumber: () => number } | number | null),
      commissionAmount: toNumber(record.commissionAmount as { toNumber: () => number } | number | null),
      partnerNetAmount: toNumber(record.partnerNetAmount as { toNumber: () => number } | number | null),
      feeMinimumApplied: record.feeMinimumApplied,
      consumerId: record.consumerId,
      partnerId: record.partnerId,
      parentTxId: record.parentTxId,
      idempotencyKey: record.idempotencyKey,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
