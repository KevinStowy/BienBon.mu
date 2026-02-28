import { Injectable } from '@nestjs/common';
import { Prisma, ReservationStatus as PrismaReservationStatus } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  ReservationRepositoryPort,
  ReservationFilters,
  ReservationPagination,
  PaginatedReservations,
  StatusHistoryEntry,
} from '../../ports/reservation.repository.port';
import type { Reservation } from '../../domain/entities/reservation.entity';
import type { ReservationStatus } from '../../domain/enums/reservation-status.enum';
import { randomUUID } from 'crypto';

type PrismaReservationRecord = {
  id: string;
  basketId: string;
  consumerId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
  status: string;
  qrCode: string;
  pinCode: string;
  expiresAt: Date | null;
  confirmedAt: Date | null;
  readyAt: Date | null;
  pickedUpAt: Date | null;
  cancelledAt: Date | null;
  noShowAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Prisma implementation of ReservationRepositoryPort.
 *
 * ADR-024: Adapter (outbound) — implements the port defined by the domain.
 * ADR-003: Database persistence via Prisma ORM.
 */
@Injectable()
export class PrismaReservationRepository extends ReservationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Reservation | null> {
    const record = await this.prisma.reservation.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async findMany(
    filters: ReservationFilters,
    pagination: ReservationPagination,
  ): Promise<PaginatedReservations> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(pagination);
    const skip = (pagination.page - 1) * pagination.limit;

    const [records, total] = await this.prisma.$transaction([
      this.prisma.reservation.findMany({
        where,
        orderBy,
        skip,
        take: pagination.limit,
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      reservations: records.map((r) => this.toEntity(r)),
      total,
    };
  }

  async findActiveByConsumerAndBasket(
    consumerId: string,
    basketId: string,
  ): Promise<Reservation | null> {
    const record = await this.prisma.reservation.findFirst({
      where: {
        consumerId,
        basketId,
        status: {
          in: [
            PrismaReservationStatus.PENDING_PAYMENT,
            PrismaReservationStatus.CONFIRMED,
          ],
        },
      },
    });
    if (!record) return null;
    return this.toEntity(record);
  }

  async create(
    data: Omit<Reservation, 'createdAt' | 'updatedAt'>,
  ): Promise<Reservation> {
    const now = new Date();
    const record = await this.prisma.reservation.create({
      data: {
        id: data.id,
        basketId: data.basketId,
        consumerId: data.consumerId,
        quantity: data.quantity,
        unitPrice: new Prisma.Decimal(data.unitPrice),
        totalPrice: new Prisma.Decimal(data.totalPrice),
        status: data.status as unknown as PrismaReservationStatus,
        qrCode: data.qrCode,
        pinCode: data.pinCode,
        expiresAt: data.expiresAt ?? null,
        confirmedAt: data.confirmedAt ?? null,
        readyAt: data.readyAt ?? null,
        pickedUpAt: data.pickedUpAt ?? null,
        cancelledAt: data.cancelledAt ?? null,
        noShowAt: data.noShowAt ?? null,
        expiredAt: data.expiredAt ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });
    return this.toEntity(record);
  }

  async update(
    id: string,
    data: Partial<
      Omit<Reservation, 'id' | 'basketId' | 'consumerId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<Reservation> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.status !== undefined) {
      updateData['status'] = data.status as unknown as PrismaReservationStatus;
    }
    if (data.confirmedAt !== undefined) updateData['confirmedAt'] = data.confirmedAt;
    if (data.readyAt !== undefined) updateData['readyAt'] = data.readyAt;
    if (data.pickedUpAt !== undefined) updateData['pickedUpAt'] = data.pickedUpAt;
    if (data.cancelledAt !== undefined) updateData['cancelledAt'] = data.cancelledAt;
    if (data.noShowAt !== undefined) updateData['noShowAt'] = data.noShowAt;
    if (data.expiredAt !== undefined) updateData['expiredAt'] = data.expiredAt;

    const record = await this.prisma.reservation.update({
      where: { id },
      data: updateData,
    });
    return this.toEntity(record);
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    historyEntry: StatusHistoryEntry,
  ): Promise<Reservation> {
    const now = new Date();

    const [record] = await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id },
        data: {
          status: status as unknown as PrismaReservationStatus,
          updatedAt: now,
        },
      }),
      this.prisma.reservationStatusHistory.create({
        data: {
          id: randomUUID(),
          reservationId: id,
          fromStatus: historyEntry.fromStatus,
          toStatus: historyEntry.toStatus,
          event: historyEntry.event,
          actorId: historyEntry.actorId ?? null,
          actorRole: historyEntry.actorRole ?? null,
          metadata: (historyEntry.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          createdAt: now,
        },
      }),
    ]);

    return this.toEntity(record);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildWhereClause(
    filters: ReservationFilters,
  ): Prisma.ReservationWhereInput {
    const where: Prisma.ReservationWhereInput = {};

    if (filters.consumerId) where.consumerId = filters.consumerId;
    if (filters.basketId) where.basketId = filters.basketId;
    if (filters.status) {
      where.status = filters.status as unknown as PrismaReservationStatus;
    }

    // storeId filter requires a join through basket
    if (filters.storeId) {
      where.basket = { storeId: filters.storeId };
    }

    return where;
  }

  private buildOrderBy(
    pagination: ReservationPagination,
  ): Prisma.ReservationOrderByWithRelationInput {
    const sortOrder = pagination.sortOrder ?? 'desc';

    switch (pagination.sortBy) {
      case 'created_at':
        return { createdAt: sortOrder };
      case 'updated_at':
        return { updatedAt: sortOrder };
      default:
        return { createdAt: 'desc' };
    }
  }

  private toEntity(record: PrismaReservationRecord): Reservation {
    return {
      id: record.id,
      basketId: record.basketId,
      consumerId: record.consumerId,
      quantity: record.quantity,
      unitPrice: Number(record.unitPrice),
      totalPrice: Number(record.totalPrice),
      status: record.status as ReservationStatus,
      qrCode: record.qrCode,
      pinCode: record.pinCode,
      expiresAt: record.expiresAt ?? null,
      confirmedAt: record.confirmedAt ?? null,
      readyAt: record.readyAt ?? null,
      pickedUpAt: record.pickedUpAt ?? null,
      cancelledAt: record.cancelledAt ?? null,
      noShowAt: record.noShowAt ?? null,
      expiredAt: record.expiredAt ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
