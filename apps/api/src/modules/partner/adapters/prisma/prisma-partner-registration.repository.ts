// =============================================================================
// Prisma Partner Registration Repository — outbound adapter (driven)
// =============================================================================
// ADR-024: Adapter pattern — implements PartnerRegistrationRepositoryPort.
// ADR-003: Database persistence via Prisma ORM.
// =============================================================================

import { Injectable } from '@nestjs/common';
import { ApprovalStatus } from '@bienbon/shared-types';
import {
  ApprovalStatus as PrismaApprovalStatus,
  RegistrationChannel as PrismaRegistrationChannel,
} from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PartnerRegistrationRepositoryPort,
  PartnerProfileRecord,
  PartnerRegistrationRequestRecord,
  CreatePartnerProfileData,
  CreateRegistrationRequestData,
} from '../../ports/partner-registration.repository.port';

/**
 * Prisma implementation of PartnerRegistrationRepositoryPort.
 *
 * ADR-024: Adapter (outbound) — implements the port defined by the domain.
 */
@Injectable()
export class PrismaPartnerRegistrationRepository extends PartnerRegistrationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findActiveRequest(userId: string): Promise<PartnerRegistrationRequestRecord | null> {
    const record = await this.prisma.partnerRegistrationRequest.findFirst({
      where: {
        userId,
        status: {
          in: [
            ApprovalStatus.PENDING as unknown as PrismaApprovalStatus,
            ApprovalStatus.IN_REVIEW as unknown as PrismaApprovalStatus,
          ],
        },
      },
    });

    if (!record) return null;
    return this.toRequestRecord(record);
  }

  async findProfileByUserId(userId: string): Promise<PartnerProfileRecord | null> {
    const profile = await this.prisma.partnerProfile.findUnique({
      where: { userId },
    });

    if (!profile) return null;
    return this.toProfileRecord(profile);
  }

  async findRequestByIdAndUser(
    requestId: string,
    userId: string,
  ): Promise<PartnerRegistrationRequestRecord | null> {
    const record = await this.prisma.partnerRegistrationRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!record) return null;
    return this.toRequestRecord(record);
  }

  async findMostRecentRequest(userId: string): Promise<PartnerRegistrationRequestRecord | null> {
    const record = await this.prisma.partnerRegistrationRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return null;
    return this.toRequestRecord(record);
  }

  async createProfileAndRequest(
    profileData: CreatePartnerProfileData,
    requestData: CreateRegistrationRequestData,
  ): Promise<{
    partnerProfile: PartnerProfileRecord;
    registrationRequest: PartnerRegistrationRequestRecord;
  }> {
    const [partnerProfile, registrationRequest] = await this.prisma.$transaction(async (tx) => {
      let profile = await tx.partnerProfile.findUnique({
        where: { userId: profileData.userId },
      });

      if (!profile) {
        profile = await tx.partnerProfile.create({
          data: {
            userId: profileData.userId,
            registrationChannel:
              profileData.registrationChannel as unknown as PrismaRegistrationChannel,
          },
        });
      }

      const request = await tx.partnerRegistrationRequest.create({
        data: {
          userId: requestData.userId,
          businessData: requestData.businessData,
          documentUrls: requestData.documentUrls,
          registrationChannel:
            requestData.registrationChannel as unknown as PrismaRegistrationChannel,
        },
      });

      return [profile, request] as const;
    });

    return {
      partnerProfile: this.toProfileRecord(partnerProfile),
      registrationRequest: this.toRequestRecord(registrationRequest),
    };
  }

  async cancelRequest(requestId: string): Promise<PartnerRegistrationRequestRecord> {
    const updated = await this.prisma.partnerRegistrationRequest.update({
      where: { id: requestId },
      data: { status: ApprovalStatus.CANCELLED as unknown as PrismaApprovalStatus },
    });

    return this.toRequestRecord(updated);
  }

  async listAllRequests(
    filters: { status?: ApprovalStatus },
  ): Promise<PartnerRegistrationRequestRecord[]> {
    const records = await this.prisma.partnerRegistrationRequest.findMany({
      where: filters.status
        ? { status: filters.status as unknown as PrismaApprovalStatus }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toRequestRecord(r));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toProfileRecord(profile: Record<string, any>): PartnerProfileRecord {
    return {
      id: profile.id,
      userId: profile.userId,
      registrationChannel: profile.registrationChannel ?? '',
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toRequestRecord(record: Record<string, any>): PartnerRegistrationRequestRecord {
    return {
      id: record.id,
      userId: record.userId,
      status: record.status,
      businessData: record.businessData,
      documentUrls: record.documentUrls,
      registrationChannel: record.registrationChannel ?? '',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
