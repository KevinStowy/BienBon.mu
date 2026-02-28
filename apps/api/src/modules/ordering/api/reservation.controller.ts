import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { ReservationService } from '../application/services/reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ValidatePickupDto } from './dto/validate-pickup.dto';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { PaginatedResponseDto } from '../../../shared/dto/pagination.dto';
import type { Reservation } from '../domain/entities/reservation.entity';

/**
 * REST controller for the Ordering bounded context.
 *
 * All endpoints require JWT authentication (JwtAuthGuard is global).
 * RBAC roles are enforced per endpoint.
 *
 * ADR-004: REST API with OpenAPI decorators on every endpoint.
 * ADR-010: Auth via Supabase JWT.
 * ADR-011: RBAC via @Roles decorator.
 */
@ApiTags('ordering')
@ApiBearerAuth()
@Controller('ordering')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  // ---------------------------------------------------------------------------
  // POST /ordering/reservations — Create reservation (CONSUMER)
  // ---------------------------------------------------------------------------

  @Post('reservations')
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Create a reservation',
    description:
      'Consumer reserves a basket. Stock is decremented atomically. ' +
      'Reservation starts in PENDING_PAYMENT status and expires in 5 minutes if not paid.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reservation created successfully',
    type: ReservationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Insufficient stock or basket not available' })
  @ApiConflictResponse({ description: 'Consumer already has an active reservation for this basket' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async createReservation(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.reservationService.createReservation({
      basketId: dto.basketId,
      consumerId: user.id,
      quantity: dto.quantity,
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // GET /ordering/reservations — List my reservations (CONSUMER)
  // ---------------------------------------------------------------------------

  @Get('reservations')
  @Roles(Role.CONSUMER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List my reservations',
    description: 'Returns a paginated list of the authenticated consumer\'s reservations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reservations',
    type: PaginatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async listMyReservations(
    @Query() query: ListReservationsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedResponseDto<ReservationResponseDto>> {
    const result = await this.reservationService.listConsumerReservations({
      consumerId: user.id,
      status: query.status,
      page: query.page,
      limit: query.limit,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
    });

    return PaginatedResponseDto.create(
      result.reservations.map((r) => this.toDto(r)),
      result.total,
      query,
    );
  }

  // ---------------------------------------------------------------------------
  // GET /ordering/reservations/:id — Get reservation details
  // ---------------------------------------------------------------------------

  @Get('reservations/:id')
  @Roles(Role.CONSUMER, Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get reservation details',
    description:
      'Returns a single reservation by ID. ' +
      'Consumers can only access their own reservations. ' +
      'Partners can access reservations for their stores.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation details',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  async getReservation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.reservationService.getReservation({
      reservationId: id,
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // POST /ordering/reservations/:id/confirm — Confirm payment (ADMIN/system)
  // ---------------------------------------------------------------------------

  @Post('reservations/:id/confirm')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm reservation payment',
    description:
      'Marks payment as received. Transitions PENDING_PAYMENT → CONFIRMED. ' +
      'Called by the system/admin after payment provider webhook.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation confirmed',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async confirmReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.reservationService.confirmReservation({
      reservationId: id,
      actorId: user.id,
      actorRole: user.roles[0] ?? 'admin',
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // POST /ordering/reservations/:id/cancel — Cancel reservation
  // ---------------------------------------------------------------------------

  @Post('reservations/:id/cancel')
  @Roles(Role.CONSUMER, Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a reservation',
    description:
      'Cancel a reservation. Consumers can cancel before the pickup window starts. ' +
      'Partners can cancel at any time. Stock is re-incremented on cancellation.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation cancelled',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition or cancellation window expired' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  async cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReservationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationResponseDto> {
    // Determine actor role for the cancellation logic
    const actorRole = this.resolveActorRole(user);

    const reservation = await this.reservationService.cancelReservation({
      reservationId: id,
      actorId: user.id,
      actorRole,
      reason: dto.reason,
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // POST /ordering/reservations/:id/ready — Mark as ready (PARTNER)
  // ---------------------------------------------------------------------------

  @Post('reservations/:id/ready')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark reservation as ready for pickup',
    description:
      'Partner marks the basket as prepared and ready for pickup. ' +
      'Transitions CONFIRMED → READY.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation marked as ready',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async markReady(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.reservationService.markReady({
      reservationId: id,
      actorId: user.id,
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // POST /ordering/reservations/:id/validate-pickup — Validate pickup (PARTNER)
  // ---------------------------------------------------------------------------

  @Post('reservations/:id/validate-pickup')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate basket pickup',
    description:
      'Partner validates consumer pickup via QR code or PIN code. ' +
      'Transitions READY → PICKED_UP.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Pickup validated — reservation marked PICKED_UP',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({ description: 'Invalid QR/PIN code or invalid state transition' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async validatePickup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidatePickupDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationResponseDto> {
    if (!dto.qrCode && !dto.pinCode) {
      throw new BadRequestException(
        'Either qrCode or pinCode must be provided',
      );
    }

    const reservation = await this.reservationService.validatePickup({
      reservationId: id,
      actorId: user.id,
      qrCode: dto.qrCode,
      pinCode: dto.pinCode,
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // POST /ordering/reservations/:id/no-show — Mark no-show (PARTNER)
  // ---------------------------------------------------------------------------

  @Post('reservations/:id/no-show')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark reservation as no-show',
    description:
      'Partner or system marks a reservation as no-show after the pickup window has closed. ' +
      'Transitions READY → NO_SHOW.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation marked as no-show',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.reservationService.markNoShow({
      reservationId: id,
      actorId: user.id,
      actorRole: user.roles[0] ?? 'partner',
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // POST /ordering/reservations/:id/expire — Expire reservation (system/cron)
  // ---------------------------------------------------------------------------

  @Post('reservations/:id/expire')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Expire a reservation',
    description:
      'System or cron job expires a PENDING_PAYMENT reservation that was not paid. ' +
      'Stock is re-incremented. Transitions PENDING_PAYMENT → EXPIRED.',
  })
  @ApiParam({ name: 'id', description: 'Reservation UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation expired',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async expireReservation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.reservationService.expireReservation({
      reservationId: id,
    });
    return this.toDto(reservation);
  }

  // ---------------------------------------------------------------------------
  // GET /ordering/store/:storeId/reservations — List store reservations (PARTNER)
  // ---------------------------------------------------------------------------

  @Get('store/:storeId/reservations')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List store reservations',
    description:
      'Returns a paginated list of reservations for a specific store. ' +
      'Used by the partner dashboard.',
  })
  @ApiParam({ name: 'storeId', description: 'Store UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of store reservations',
    type: PaginatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async listStoreReservations(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Query() query: ListReservationsQueryDto,
  ): Promise<PaginatedResponseDto<ReservationResponseDto>> {
    const result = await this.reservationService.listStoreReservations({
      storeId,
      status: query.status,
      page: query.page,
      limit: query.limit,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
    });

    return PaginatedResponseDto.create(
      result.reservations.map((r) => this.toDto(r)),
      result.total,
      query,
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toDto(reservation: Reservation): ReservationResponseDto {
    return ReservationResponseDto.fromEntity(reservation);
  }

  /**
   * Resolves the actor's role for cancellation based on their RBAC roles.
   * Partners and admins cancel as 'partner'; consumers as 'consumer'.
   */
  private resolveActorRole(user: AuthUser): 'consumer' | 'partner' | 'admin' {
    if (
      user.roles.includes(Role.ADMIN) ||
      user.roles.includes(Role.SUPER_ADMIN)
    ) {
      return 'admin';
    }
    if (user.roles.includes(Role.PARTNER)) {
      return 'partner';
    }
    return 'consumer';
  }
}
