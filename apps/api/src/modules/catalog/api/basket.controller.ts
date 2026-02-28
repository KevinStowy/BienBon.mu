import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { BasketService } from '../application/services/basket.service';
import { CreateBasketDto } from './dto/create-basket.dto';
import { UpdateBasketDto } from './dto/update-basket.dto';
import { BasketResponseDto, StockDecrementResponseDto } from './dto/basket-response.dto';
import { ListBasketsQueryDto } from './dto/list-baskets-query.dto';
import { CancelBasketDto } from './dto/cancel-basket.dto';
import { DecrementStockDto } from './dto/decrement-stock.dto';
import { PaginatedResponseDto } from '../../../shared/dto/pagination.dto';
import type { Basket } from '../domain/entities/basket.entity';

@ApiTags('catalog')
@Controller('catalog/baskets')
export class BasketController {
  constructor(private readonly basketService: BasketService) {}

  // ---------------------------------------------------------------------------
  // POST /catalog/baskets — Create a basket (PARTNER only)
  // ---------------------------------------------------------------------------
  @Post()
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new basket', description: 'Creates a basket in DRAFT status. Only accessible by partners.' })
  @ApiResponse({ status: 201, description: 'Basket created successfully', type: BasketResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input or price rule violation' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions' })
  async createBasket(@Body() dto: CreateBasketDto): Promise<BasketResponseDto> {
    const basket = await this.basketService.createBasket({
      storeId: dto.storeId,
      title: dto.title,
      description: dto.description,
      originalPrice: dto.originalPrice,
      sellingPrice: dto.sellingPrice,
      quantity: dto.quantity,
      categoryId: dto.categoryId,
      photoUrl: dto.photoUrl,
      pickupStart: new Date(dto.pickupStart),
      pickupEnd: new Date(dto.pickupEnd),
      tagIds: dto.tagIds,
      templateId: dto.templateId,
    });
    return this.toResponseDto(basket);
  }

  // ---------------------------------------------------------------------------
  // GET /catalog/baskets — List available baskets (PUBLIC)
  // ---------------------------------------------------------------------------
  @Get()
  @Public()
  @ApiOperation({ summary: 'List available baskets', description: 'Returns a paginated list of baskets. Defaults to PUBLISHED status.' })
  @ApiResponse({ status: 200, description: 'Paginated list of baskets', type: PaginatedResponseDto })
  async listBaskets(@Query() query: ListBasketsQueryDto): Promise<PaginatedResponseDto<BasketResponseDto>> {
    const result = await this.basketService.getAvailableBaskets({
      categoryId: query.category_id,
      tagIds: query.tag_ids,
      status: query.status,
      minPrice: query.min_price,
      maxPrice: query.max_price,
      pickupAfter: query.pickup_after ? new Date(query.pickup_after) : undefined,
      pickupBefore: query.pickup_before ? new Date(query.pickup_before) : undefined,
      latitude: query.latitude,
      longitude: query.longitude,
      radiusKm: query.radius_km,
      page: query.page,
      limit: query.limit,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
    });

    return PaginatedResponseDto.create(
      result.baskets.map((b) => this.toResponseDto(b)),
      result.total,
      query,
    );
  }

  // ---------------------------------------------------------------------------
  // GET /catalog/baskets/:id — Get basket details (PUBLIC)
  // ---------------------------------------------------------------------------
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get basket details', description: 'Returns a single basket by ID.' })
  @ApiParam({ name: 'id', description: 'Basket UUID', type: String })
  @ApiResponse({ status: 200, description: 'Basket details', type: BasketResponseDto })
  @ApiNotFoundResponse({ description: 'Basket not found' })
  async getBasket(@Param('id', ParseUUIDPipe) id: string): Promise<BasketResponseDto> {
    const basket = await this.basketService.getBasket({ basketId: id });
    return this.toResponseDto(basket);
  }

  // ---------------------------------------------------------------------------
  // PATCH /catalog/baskets/:id — Update basket (PARTNER, DRAFT only)
  // ---------------------------------------------------------------------------
  @Patch(':id')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a basket', description: 'Updates a basket. Only allowed when basket is in DRAFT status.' })
  @ApiParam({ name: 'id', description: 'Basket UUID', type: String })
  @ApiResponse({ status: 200, description: 'Basket updated successfully', type: BasketResponseDto })
  @ApiNotFoundResponse({ description: 'Basket not found' })
  @ApiBadRequestResponse({ description: 'Basket is not in DRAFT status or invalid input' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  async updateBasket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBasketDto,
  ): Promise<BasketResponseDto> {
    const basket = await this.basketService.updateBasket({
      basketId: id,
      title: dto.title,
      description: dto.description,
      originalPrice: dto.originalPrice,
      sellingPrice: dto.sellingPrice,
      quantity: dto.quantity,
      categoryId: dto.categoryId,
      photoUrl: dto.photoUrl,
      pickupStart: dto.pickupStart ? new Date(dto.pickupStart) : undefined,
      pickupEnd: dto.pickupEnd ? new Date(dto.pickupEnd) : undefined,
      tagIds: dto.tagIds,
    });
    return this.toResponseDto(basket);
  }

  // ---------------------------------------------------------------------------
  // POST /catalog/baskets/:id/publish — Publish basket (PARTNER)
  // ---------------------------------------------------------------------------
  @Post(':id/publish')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a basket', description: 'Transitions a DRAFT basket to PUBLISHED, making it visible to consumers.' })
  @ApiParam({ name: 'id', description: 'Basket UUID', type: String })
  @ApiResponse({ status: 200, description: 'Basket published successfully', type: BasketResponseDto })
  @ApiNotFoundResponse({ description: 'Basket not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition or publish guard failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  async publishBasket(@Param('id', ParseUUIDPipe) id: string): Promise<BasketResponseDto> {
    const basket = await this.basketService.publishBasket({ basketId: id });
    return this.toResponseDto(basket);
  }

  // ---------------------------------------------------------------------------
  // POST /catalog/baskets/:id/cancel — Cancel basket (PARTNER)
  // ---------------------------------------------------------------------------
  @Post(':id/cancel')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a basket', description: 'Cancels a PUBLISHED basket.' })
  @ApiParam({ name: 'id', description: 'Basket UUID', type: String })
  @ApiResponse({ status: 200, description: 'Basket cancelled successfully', type: BasketResponseDto })
  @ApiNotFoundResponse({ description: 'Basket not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  async cancelBasket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBasketDto,
  ): Promise<BasketResponseDto> {
    const basket = await this.basketService.cancelBasket({
      basketId: id,
      reason: dto.reason,
    });
    return this.toResponseDto(basket);
  }

  // ---------------------------------------------------------------------------
  // POST /catalog/baskets/:id/archive — Archive basket (PARTNER)
  // ---------------------------------------------------------------------------
  @Post(':id/archive')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a basket', description: 'Archives a basket. Allowed from PUBLISHED, DRAFT, ENDED, or CANCELLED status.' })
  @ApiParam({ name: 'id', description: 'Basket UUID', type: String })
  @ApiResponse({ status: 200, description: 'Basket archived successfully', type: BasketResponseDto })
  @ApiNotFoundResponse({ description: 'Basket not found' })
  @ApiBadRequestResponse({ description: 'Invalid state transition' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  async archiveBasket(@Param('id', ParseUUIDPipe) id: string): Promise<BasketResponseDto> {
    const basket = await this.basketService.archiveBasket({ basketId: id });
    return this.toResponseDto(basket);
  }

  // ---------------------------------------------------------------------------
  // POST /catalog/baskets/:id/decrement-stock — Decrement stock (internal)
  // ---------------------------------------------------------------------------
  @Post(':id/decrement-stock')
  @Roles(Role.PARTNER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decrement basket stock',
    description: 'Atomically decrements basket stock. Used internally by the Ordering BC when a reservation is confirmed.',
  })
  @ApiParam({ name: 'id', description: 'Basket UUID', type: String })
  @ApiResponse({ status: 200, description: 'Stock decremented successfully', type: StockDecrementResponseDto })
  @ApiNotFoundResponse({ description: 'Basket not found' })
  @ApiBadRequestResponse({ description: 'Insufficient stock' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication token' })
  async decrementStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecrementStockDto,
  ): Promise<StockDecrementResponseDto> {
    return this.basketService.decrementStock({
      basketId: id,
      quantity: dto.quantity,
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toResponseDto(basket: Basket): BasketResponseDto {
    const dto = new BasketResponseDto();
    dto.id = basket.id;
    dto.storeId = basket.storeId;
    dto.templateId = basket.templateId ?? undefined;
    dto.title = basket.title;
    dto.description = basket.description ?? undefined;
    dto.originalPrice = basket.originalPrice;
    dto.sellingPrice = basket.sellingPrice;
    dto.quantity = basket.quantity;
    dto.stock = basket.stock;
    dto.categoryId = basket.categoryId;
    dto.photoUrl = basket.photoUrl ?? undefined;
    dto.pickupStart = basket.pickupStart;
    dto.pickupEnd = basket.pickupEnd;
    dto.status = basket.status;
    dto.tagIds = basket.tagIds ?? [];
    dto.createdAt = basket.createdAt ?? new Date();
    dto.updatedAt = basket.updatedAt ?? new Date();
    return dto;
  }
}
