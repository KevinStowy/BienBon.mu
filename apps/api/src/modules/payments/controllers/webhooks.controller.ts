// =============================================================================
// WebhooksController — Peach Payments webhook receiver
// =============================================================================
// ADR-004: REST API
// Security: HMAC-SHA256 signature verification with timing-safe comparison
// Idempotency: check if providerTxId was already processed
// =============================================================================

import {
  Controller,
  Post,
  Headers,
  HttpCode,
  BadRequestException,
  Logger,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentOrchestratorService } from '../application/services/payment-orchestrator.service';
import { PaymentTransactionRepositoryPort } from '../ports/payment-transaction.repository.port';
import { isPeachSuccess } from '../adapters/peach/peach-payments.mapper';
import { PaymentStatus } from '@bienbon/shared-types';
import type { PeachPaymentResponse } from '../adapters/peach/peach-payments.types';

/** Peach webhook secret (from environment — null in mock mode) */
const PEACH_WEBHOOK_SECRET = process.env['PEACH_WEBHOOK_SECRET'] ?? null;

@ApiTags('webhooks')
@Controller('api/webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentService: PaymentOrchestratorService,
    private readonly txRepo: PaymentTransactionRepositoryPort,
  ) {}

  /**
   * POST /api/webhooks/peach
   *
   * Receives asynchronous payment status updates from Peach Payments.
   *
   * Security:
   * 1. Verify HMAC-SHA256 signature with timing-safe comparison
   * 2. Check idempotency via providerTxId
   *
   * Processing:
   * 3. Map Peach result codes to internal status
   * 4. Update PaymentTransaction
   * 5. On successful capture: create ledger entries
   * 6. Emit domain events
   */
  @Post('peach')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive Peach Payments webhook',
    description:
      'Processes asynchronous payment notifications from Peach Payments. ' +
      'Requires valid HMAC-SHA256 signature in x-peach-signature header.',
  })
  @ApiHeader({
    name: 'x-peach-signature',
    description: 'HMAC-SHA256 signature of the raw request body',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or malformed payload' })
  async handlePeachWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('x-peach-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    // 1. Verify HMAC signature (skip verification if no secret configured — mock mode)
    if (PEACH_WEBHOOK_SECRET) {
      if (!signature) {
        throw new BadRequestException('Missing x-peach-signature header');
      }

      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        throw new BadRequestException('Raw body not available');
      }

      const isValid = this.verifyHmacSignature(rawBody, signature, PEACH_WEBHOOK_SECRET);
      if (!isValid) {
        this.logger.warn('Invalid Peach webhook signature — request rejected');
        throw new BadRequestException('Invalid webhook signature');
      }
    } else {
      this.logger.debug('[MOCK] Skipping HMAC verification — no webhook secret configured');
    }

    // 2. Parse payload
    let payload: PeachPaymentResponse;
    try {
      const body = req.body as unknown;
      if (typeof body !== 'object' || body === null) {
        throw new Error('Body is not an object');
      }
      payload = body as PeachPaymentResponse;
    } catch {
      throw new BadRequestException('Malformed webhook payload');
    }

    const providerTxId = payload.id;
    if (!providerTxId) {
      throw new BadRequestException('Missing transaction ID in webhook payload');
    }

    // 3. Idempotency check — skip if already processed
    const existing = await this.txRepo.findByProviderTxId(providerTxId);
    if (existing) {
      const alreadyProcessed =
        existing.status === PaymentStatus.SUCCEEDED ||
        existing.status === PaymentStatus.FAILED ||
        existing.status === PaymentStatus.CANCELLED;

      if (alreadyProcessed) {
        this.logger.log(
          `Webhook idempotency: tx ${providerTxId} already processed (status: ${existing.status})`,
        );
        return { received: true };
      }
    }

    // 4. Map result code and update transaction
    const success = isPeachSuccess(payload.result.code);
    const newStatus = success ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

    if (existing) {
      await this.txRepo.update(existing.id, {
        status: newStatus,
        providerStatus: payload.result.code,
      });

      this.logger.log(
        `Webhook processed: providerTxId=${providerTxId} status=${newStatus}`,
      );

      // 5. If it's a successful capture, post ledger entries
      if (success && payload.paymentType === 'CP' && existing.partnerId) {
        try {
          await this.paymentService.capture(existing.reservationId);
        } catch (error) {
          this.logger.error(
            `Failed to post ledger entries for webhook capture ${providerTxId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          // Return 200 anyway — webhook was received. Ledger can be reconciled separately.
        }
      }
    } else {
      this.logger.warn(
        `Webhook received for unknown providerTxId: ${providerTxId}`,
      );
    }

    return { received: true };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Verifies HMAC-SHA256 signature using timing-safe comparison.
   * Prevents timing attacks on signature verification.
   */
  private verifyHmacSignature(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const expected = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expected, 'hex');
      const signatureBuf = Buffer.from(signature, 'hex');

      if (expectedBuf.length !== signatureBuf.length) {
        return false;
      }

      return timingSafeEqual(expectedBuf, signatureBuf);
    } catch {
      return false;
    }
  }
}
