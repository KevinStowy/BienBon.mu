// =============================================================================
// Partner Registration Service — onboarding flow
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ApprovalStatus, RegistrationChannel } from '@bienbon/shared-types';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../../shared/errors/domain-error';
import type { CreateRegistrationDto } from '../dto/create-registration.dto';

@Injectable()
export class PartnerRegistrationService {
  private readonly logger = new Logger(PartnerRegistrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Submit a new partner registration request.
   * Creates both the PartnerProfile (PENDING) and PartnerRegistrationRequest.
   */
  async submitRegistration(
    userId: string,
    dto: CreateRegistrationDto,
  ) {
    this.logger.log(`Submitting registration for user ${userId}`);

    // Ensure no active request already exists
    const existing = await this.prisma.partnerRegistrationRequest.findFirst({
      where: {
        userId,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.IN_REVIEW] },
      },
    });

    if (existing) {
      throw new ConflictError(
        'PARTNER_REGISTRATION_PENDING',
        'A registration request is already pending for this user',
      );
    }

    // Create partner profile + registration request atomically
    const [partnerProfile, registrationRequest] = await this.prisma.$transaction(async (tx) => {
      let profile = await tx.partnerProfile.findUnique({ where: { userId } });

      if (!profile) {
        profile = await tx.partnerProfile.create({
          data: {
            userId,
            registrationChannel: dto.registrationChannel ?? RegistrationChannel.WEB_FORM,
          },
        });
      }

      const request = await tx.partnerRegistrationRequest.create({
        data: {
          userId,
          businessData: dto.businessData as object,
          documentUrls: dto.documentUrls as object,
          registrationChannel: dto.registrationChannel ?? RegistrationChannel.WEB_FORM,
        },
      });

      return [profile, request] as const;
    });

    this.logger.log(
      `Registration submitted: partner=${partnerProfile.id}, request=${registrationRequest.id}`,
    );

    return { partnerProfile, registrationRequest };
  }

  /**
   * Get the current (most recent) registration request for a user.
   */
  async getCurrentRequest(userId: string) {
    return this.prisma.partnerRegistrationRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a pending registration request.
   */
  async cancelRequest(requestId: string, userId: string) {
    const request = await this.prisma.partnerRegistrationRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundError(
        'PARTNER_REGISTRATION_NOT_FOUND',
        `Registration request "${requestId}" not found`,
      );
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BusinessRuleError(
        'PARTNER_REGISTRATION_NOT_CANCELLABLE',
        `Registration request with status "${request.status}" cannot be cancelled`,
      );
    }

    return this.prisma.partnerRegistrationRequest.update({
      where: { id: requestId },
      data: { status: ApprovalStatus.CANCELLED },
    });
  }

  /**
   * List all registration requests for admin approval queue.
   */
  async listAllRequests(filters: { status?: ApprovalStatus } = {}) {
    return this.prisma.partnerRegistrationRequest.findMany({
      where: filters.status ? { status: filters.status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }
}
