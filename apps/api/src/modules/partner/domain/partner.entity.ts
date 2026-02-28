// =============================================================================
// Partner Entity — domain type (maps to PartnerProfile Prisma model)
// =============================================================================

import { z } from 'zod';
import { PartnerStatus, RegistrationChannel } from '@bienbon/shared-types';

export const PartnerSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.nativeEnum(PartnerStatus),
  statusReason: z.string().nullable(),
  statusChangedAt: z.date().nullable(),
  statusChangedBy: z.string().uuid().nullable(),
  submittedAt: z.date(),
  validatedAt: z.date().nullable(),
  validatedBy: z.string().uuid().nullable(),
  registrationChannel: z.nativeEnum(RegistrationChannel).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Partner = z.infer<typeof PartnerSchema>;

export function createPartner(input: unknown): Partner {
  return PartnerSchema.parse(input);
}
