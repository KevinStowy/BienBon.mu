import {
  Controller,
  Query,
  Headers,
  Sse,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { SseService } from './sse.service';

/**
 * SSE Controller — real-time event streams for consumers, partners, and admins.
 *
 * Each endpoint returns an Observable<MessageEvent> via the @Sse() decorator,
 * which NestJS (with Fastify adapter) converts to an HTTP/1.1 server-sent events stream.
 *
 * Event flow:
 * 1. Client connects with a valid JWT Bearer token
 * 2. RolesGuard verifies the user has the required role for the channel
 * 3. SseService registers the connection and returns an Observable
 * 4. Domain events from other BCs (catalog, ordering, etc.) are forwarded
 *    through EventEmitter2 → listeners → SseService → Observable → client
 * 5. A heartbeat is emitted every 30 seconds to keep the connection alive
 * 6. When the client disconnects, the connection is removed from the registry
 *
 * ADR-009: Real-time SSE strategy
 * ADR-010: Supabase JWT authentication
 * ADR-011: RBAC
 */
@ApiTags('sse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sse')
export class SseController {
  private readonly logger = new Logger(SseController.name);

  constructor(private readonly sseService: SseService) {}

  // ---------------------------------------------------------------------------
  // GET /sse/consumer — Consumer SSE stream
  // ---------------------------------------------------------------------------

  /**
   * SSE stream for consumers.
   *
   * Events delivered:
   * - `connected` — confirmation that the stream is live
   * - `stock_update` — real-time stock changes for subscribed baskets
   * - `reservation_status` — reservation lifecycle updates
   * - `notification` — push notification content
   * - `unread_count` — updated unread notification badge count
   * - `heartbeat` — every 30 seconds to keep the connection alive
   *
   * Use the `?baskets=id1,id2` query param to subscribe to specific basket
   * stock updates. Without it, only reservation and notification events are
   * delivered for this consumer.
   *
   * On reconnect, send the `Last-Event-ID` header with the last received
   * event ID. The server will attempt to replay missed events from the buffer.
   */
  @Sse('consumer')
  @Roles(Role.CONSUMER)
  @ApiOperation({
    summary: 'Consumer SSE stream',
    description:
      'Real-time server-sent events for consumers. ' +
      'Delivers: stock_update (for subscribed baskets), reservation_status, ' +
      'notification, unread_count, heartbeat (every 30s). ' +
      'Required role: CONSUMER.',
  })
  @ApiQuery({
    name: 'baskets',
    required: false,
    description: 'Comma-separated basket IDs to subscribe to for stock updates (e.g. ?baskets=uuid1,uuid2)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479,c6e01ff7-c45a-4789-bc5a-f6f65be60e0a',
  })
  @ApiHeader({
    name: 'Last-Event-ID',
    required: false,
    description: 'ID of the last event received. Include on reconnect to replay missed events.',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established. Content-Type: text/event-stream.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid authentication token.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have CONSUMER role.',
  })
  @ApiResponse({
    status: 429,
    description: 'Reconnecting too fast. Wait at least 5 seconds between reconnects.',
  })
  consumerStream(
    @CurrentUser() user: AuthUser,
    @Query('baskets') basketsParam?: string,
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    this.guardReconnectRate(user.id);

    const subscriptions = this.parseBasketSubscriptions(basketsParam);

    this.logger.log(
      `Consumer connected: userId=${user.id} subscriptions=${subscriptions.join(',')}`,
    );

    return this.sseService.connect(user.id, 'consumer', subscriptions, lastEventId);
  }

  // ---------------------------------------------------------------------------
  // GET /sse/partner — Partner SSE stream
  // ---------------------------------------------------------------------------

  /**
   * SSE stream for partners.
   *
   * Events delivered:
   * - `connected` — confirmation that the stream is live
   * - `stock_update` — stock changes for baskets in the partner's store
   * - `reservation_received` — a new consumer reservation for the partner's store
   * - `pickup_validated` — a consumer has picked up their order
   * - `reservation_cancelled` — a reservation was cancelled (by consumer or system)
   * - `heartbeat` — every 30 seconds
   */
  @Sse('partner')
  @Roles(Role.PARTNER)
  @ApiOperation({
    summary: 'Partner SSE stream',
    description:
      'Real-time server-sent events for partners. ' +
      'Delivers: stock_update, reservation_received, pickup_validated, ' +
      'reservation_cancelled, heartbeat (every 30s). ' +
      'Required role: PARTNER.',
  })
  @ApiHeader({
    name: 'Last-Event-ID',
    required: false,
    description: 'ID of the last event received. Include on reconnect to replay missed events.',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established. Content-Type: text/event-stream.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid authentication token.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have PARTNER role.',
  })
  @ApiResponse({
    status: 429,
    description: 'Reconnecting too fast. Wait at least 5 seconds between reconnects.',
  })
  partnerStream(
    @CurrentUser() user: AuthUser,
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    this.guardReconnectRate(user.id);

    this.logger.log(`Partner connected: userId=${user.id}`);

    return this.sseService.connect(user.id, 'partner', [], lastEventId);
  }

  // ---------------------------------------------------------------------------
  // GET /sse/admin — Admin SSE stream
  // ---------------------------------------------------------------------------

  /**
   * SSE stream for administrators.
   *
   * Events delivered:
   * - `connected` — confirmation that the stream is live
   * - `fraud_alert` — real-time fraud detection alerts (ADR-019)
   * - `heartbeat` — every 30 seconds
   *
   * Restricted to ADMIN and SUPER_ADMIN roles only.
   */
  @Sse('admin')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Admin SSE stream',
    description:
      'Real-time server-sent events for administrators. ' +
      'Delivers: fraud_alert, heartbeat (every 30s). ' +
      'Required role: ADMIN or SUPER_ADMIN.',
  })
  @ApiHeader({
    name: 'Last-Event-ID',
    required: false,
    description: 'ID of the last event received. Include on reconnect to replay missed events.',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream established. Content-Type: text/event-stream.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid authentication token.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have ADMIN or SUPER_ADMIN role.',
  })
  @ApiResponse({
    status: 429,
    description: 'Reconnecting too fast. Wait at least 5 seconds between reconnects.',
  })
  adminStream(
    @CurrentUser() user: AuthUser,
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    this.guardReconnectRate(user.id);

    this.logger.log(`Admin connected: userId=${user.id}`);

    return this.sseService.connect(user.id, 'admin', [], lastEventId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Throws 429 if the user is reconnecting too quickly (within 5 seconds).
   */
  private guardReconnectRate(userId: string): void {
    if (this.sseService.isReconnectRateLimited(userId)) {
      throw new HttpException(
        'Reconnecting too fast. Please wait at least 5 seconds between reconnects.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Parses the `?baskets=id1,id2` query param into an array of basket IDs.
   * Filters out empty strings from trailing/leading commas.
   */
  private parseBasketSubscriptions(basketsParam?: string): string[] {
    if (!basketsParam || basketsParam.trim() === '') {
      return [];
    }

    return basketsParam
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }
}
