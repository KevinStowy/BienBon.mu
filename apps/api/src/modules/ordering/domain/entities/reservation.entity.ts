import { z } from 'zod';
import { ReservationStatus } from '../enums/reservation-status.enum';

/**
 * Zod schema for the Reservation aggregate root.
 * Enforces domain invariants at the data level.
 *
 * ADR-024: Domain entity as plain object validated by Zod.
 */
export const ReservationSchema = z.object({
  id: z.string().uuid(),
  basketId: z.string().uuid(),
  consumerId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
  status: z.enum([
    ReservationStatus.PENDING_PAYMENT,
    ReservationStatus.CONFIRMED,
    ReservationStatus.READY,
    ReservationStatus.PICKED_UP,
    ReservationStatus.NO_SHOW,
    ReservationStatus.CANCELLED_CONSUMER,
    ReservationStatus.CANCELLED_PARTNER,
    ReservationStatus.EXPIRED,
  ]),
  qrCode: z.string().min(1),
  pinCode: z.string().length(6),
  expiresAt: z.date().nullable().optional(),
  confirmedAt: z.date().nullable().optional(),
  readyAt: z.date().nullable().optional(),
  pickedUpAt: z.date().nullable().optional(),
  cancelledAt: z.date().nullable().optional(),
  noShowAt: z.date().nullable().optional(),
  expiredAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Reservation = z.infer<typeof ReservationSchema>;

/**
 * Factory function that validates and creates a Reservation domain entity.
 * Throws ZodError if validation fails.
 */
export function createReservation(input: unknown): Reservation {
  return ReservationSchema.parse(input);
}
