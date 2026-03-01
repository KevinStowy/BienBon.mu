// =============================================================================
// Partner Registration Service — onboarding flow
// =============================================================================
// ADR-024: Application layer orchestrator. Depends on
// PartnerRegistrationRepositoryPort, not on PrismaService directly.
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ApprovalStatus, RegistrationChannel } from '@bienbon/shared-types';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../../../shared/errors/domain-error';
import type { CreateRegistrationDto } from '../../api/dto/create-registration.dto';
import { PartnerRegistrationRepositoryPort } from '../../ports/partner-registration.repository.port';

@Injectable()
export class PartnerRegistrationService {
  private readonly logger = new Logger(PartnerRegistrationService.name);

  constructor(
    private readonly registrationRepository: PartnerRegistrationRepositoryPort,
  ) {}

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
    const existing = await this.registrationRepository.findActiveRequest(userId);

    if (existing) {
      throw new ConflictError(
        'PARTNER_REGISTRATION_PENDING',
        'A registration request is already pending for this user',
      );
    }

    const channel = dto.registrationChannel ?? RegistrationChannel.WEB_FORM;

    const result = await this.registrationRepository.createProfileAndRequest(
      {
        userId,
        registrationChannel: channel,
      },
      {
        userId,
        businessData: dto.businessData as object,
        documentUrls: dto.documentUrls as object,
        registrationChannel: channel,
      },
    );

    this.logger.log(
      `Registration submitted: partner=${result.partnerProfile.id}, request=${result.registrationRequest.id}`,
    );

    return result;
  }

  /**
   * Get the current (most recent) registration request for a user.
   */
  async getCurrentRequest(userId: string) {
    return this.registrationRepository.findMostRecentRequest(userId);
  }

  /**
   * Cancel a pending registration request.
   */
  async cancelRequest(requestId: string, userId: string) {
    const request = await this.registrationRepository.findRequestByIdAndUser(requestId, userId);

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

    return this.registrationRepository.cancelRequest(requestId);
  }

  /**
   * List all registration requests for admin approval queue.
   */
  async listAllRequests(filters: { status?: ApprovalStatus } = {}) {
    return this.registrationRepository.listAllRequests(filters);
  }
}
