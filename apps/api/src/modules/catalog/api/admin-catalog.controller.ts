// =============================================================================
// AdminCatalogController — admin endpoints for categories and tags management
// =============================================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@bienbon/shared-types';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundError, BusinessRuleError, ConflictError } from '../../../shared/errors/domain-error';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CreateTagDto,
  UpdateTagDto,
  TagResponseDto,
} from './dto/admin-catalog.dto';

@ApiTags('Admin - Settings (Catalog)')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('api/v1/admin/settings')
export class AdminCatalogController {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // ADMIN USERS
  // ===========================================================================

  @Get('admin-users')
  @ApiOperation({ summary: 'List admin users', description: 'Returns all users with ADMIN or SUPER_ADMIN roles.' })
  @ApiResponse({ status: 200, description: 'Admin users returned' })
  async listAdminUsers(): Promise<unknown[]> {
    const adminUsers = await this.prisma.user.findMany({
      where: {
        roles: { some: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, revokedAt: null } },
      },
      include: {
        roles: { where: { revokedAt: null }, select: { role: true } },
        adminProfile: { select: { department: true } },
      },
    });

    return adminUsers.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email ?? '',
      role: u.roles.find((r) => r.role === 'SUPER_ADMIN')?.role ?? u.roles[0]?.role ?? 'ADMIN',
      department: u.adminProfile?.department ?? null,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
      lastLogin: null,
    }));
  }

  // ===========================================================================
  // CATEGORIES
  // ===========================================================================

  @Get('categories')
  @ApiOperation({ summary: 'List all categories', description: 'Returns all categories with basket counts.' })
  @ApiResponse({ status: 200, description: 'Categories returned', type: [CategoryResponseDto] })
  async listCategories(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { namesFr: 'asc' },
      include: { _count: { select: { baskets: true } } },
    });

    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      namesFr: c.namesFr,
      namesEn: c.namesEn,
      namesKr: c.namesKr,
      icon: c.icon,
      isActive: c.isActive,
      basketCount: c._count.baskets,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a category' })
  @ApiResponse({ status: 201, description: 'Category created', type: CategoryResponseDto })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<CategoryResponseDto> {
    const existing = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictError('CATEGORY_SLUG_EXISTS', `Category with slug "${dto.slug}" already exists`);
    }

    const category = await this.prisma.category.create({
      data: {
        slug: dto.slug,
        namesFr: dto.namesFr,
        namesEn: dto.namesEn ?? null,
        namesKr: dto.namesKr ?? null,
        icon: dto.icon ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'ADMIN',
        action: 'CATEGORY_CREATED',
        entityType: 'Category',
        entityId: category.id,
        changes: { slug: dto.slug, namesFr: dto.namesFr },
      },
    });

    return {
      id: category.id,
      slug: category.slug,
      namesFr: category.namesFr,
      namesEn: category.namesEn,
      namesKr: category.namesKr,
      icon: category.icon,
      isActive: category.isActive,
      basketCount: 0,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Category updated', type: CategoryResponseDto })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<CategoryResponseDto> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', `Category with ID ${id} not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugTaken = await this.prisma.category.findUnique({ where: { slug: dto.slug } });
      if (slugTaken) {
        throw new ConflictError('CATEGORY_SLUG_EXISTS', `Category with slug "${dto.slug}" already exists`);
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.namesFr !== undefined && { namesFr: dto.namesFr }),
        ...(dto.namesEn !== undefined && { namesEn: dto.namesEn }),
        ...(dto.namesKr !== undefined && { namesKr: dto.namesKr }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { _count: { select: { baskets: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'ADMIN',
        action: 'CATEGORY_UPDATED',
        entityType: 'Category',
        entityId: id,
        changes: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
      },
    });

    return {
      id: updated.id,
      slug: updated.slug,
      namesFr: updated.namesFr,
      namesEn: updated.namesEn,
      namesKr: updated.namesKr,
      icon: updated.icon,
      isActive: updated.isActive,
      basketCount: updated._count.baskets,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category', description: 'Deletes a category only if no baskets use it.' })
  @ApiParam({ name: 'id', description: 'Category ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 400, description: 'Category still in use by baskets' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
  ): Promise<{ success: boolean }> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { baskets: true } } },
    });

    if (!category) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', `Category with ID ${id} not found`);
    }

    if (category._count.baskets > 0) {
      throw new BusinessRuleError(
        'CATEGORY_IN_USE',
        `Cannot delete category "${category.slug}": ${category._count.baskets} basket(s) still reference it`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'ADMIN',
        action: 'CATEGORY_DELETED',
        entityType: 'Category',
        entityId: id,
        changes: { slug: category.slug },
      },
    });

    return { success: true };
  }

  // ===========================================================================
  // TAGS
  // ===========================================================================

  @Get('tags')
  @ApiOperation({ summary: 'List all tags', description: 'Returns all tags with basket counts.' })
  @ApiResponse({ status: 200, description: 'Tags returned', type: [TagResponseDto] })
  async listTags(): Promise<TagResponseDto[]> {
    const tags = await this.prisma.tag.findMany({
      orderBy: { namesFr: 'asc' },
      include: { _count: { select: { baskets: true } } },
    });

    return tags.map((t) => ({
      id: t.id,
      slug: t.slug,
      namesFr: t.namesFr,
      namesEn: t.namesEn,
      namesKr: t.namesKr,
      icon: t.icon,
      description: t.description,
      isActive: t.isActive,
      basketCount: t._count.baskets,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  @Post('tags')
  @ApiOperation({ summary: 'Create a tag' })
  @ApiResponse({ status: 201, description: 'Tag created', type: TagResponseDto })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async createTag(
    @Body() dto: CreateTagDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<TagResponseDto> {
    const existing = await this.prisma.tag.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictError('TAG_SLUG_EXISTS', `Tag with slug "${dto.slug}" already exists`);
    }

    const tag = await this.prisma.tag.create({
      data: {
        slug: dto.slug,
        namesFr: dto.namesFr,
        namesEn: dto.namesEn ?? null,
        namesKr: dto.namesKr ?? null,
        icon: dto.icon ?? null,
        description: dto.description ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'ADMIN',
        action: 'TAG_CREATED',
        entityType: 'Tag',
        entityId: tag.id,
        changes: { slug: dto.slug, namesFr: dto.namesFr },
      },
    });

    return {
      id: tag.id,
      slug: tag.slug,
      namesFr: tag.namesFr,
      namesEn: tag.namesEn,
      namesKr: tag.namesKr,
      icon: tag.icon,
      description: tag.description,
      isActive: tag.isActive,
      basketCount: 0,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  }

  @Patch('tags/:id')
  @ApiOperation({ summary: 'Update a tag' })
  @ApiParam({ name: 'id', description: 'Tag ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Tag updated', type: TagResponseDto })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
    @CurrentUser() admin: AuthUser,
  ): Promise<TagResponseDto> {
    const existing = await this.prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('TAG_NOT_FOUND', `Tag with ID ${id} not found`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugTaken = await this.prisma.tag.findUnique({ where: { slug: dto.slug } });
      if (slugTaken) {
        throw new ConflictError('TAG_SLUG_EXISTS', `Tag with slug "${dto.slug}" already exists`);
      }
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.namesFr !== undefined && { namesFr: dto.namesFr }),
        ...(dto.namesEn !== undefined && { namesEn: dto.namesEn }),
        ...(dto.namesKr !== undefined && { namesKr: dto.namesKr }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { _count: { select: { baskets: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'ADMIN',
        action: 'TAG_UPDATED',
        entityType: 'Tag',
        entityId: id,
        changes: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
      },
    });

    return {
      id: updated.id,
      slug: updated.slug,
      namesFr: updated.namesFr,
      namesEn: updated.namesEn,
      namesKr: updated.namesKr,
      icon: updated.icon,
      description: updated.description,
      isActive: updated.isActive,
      basketCount: updated._count.baskets,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a tag', description: 'Deletes a tag only if no baskets use it.' })
  @ApiParam({ name: 'id', description: 'Tag ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Tag deleted' })
  @ApiResponse({ status: 400, description: 'Tag still in use by baskets' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async deleteTag(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
  ): Promise<{ success: boolean }> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { baskets: true } } },
    });

    if (!tag) {
      throw new NotFoundError('TAG_NOT_FOUND', `Tag with ID ${id} not found`);
    }

    if (tag._count.baskets > 0) {
      throw new BusinessRuleError(
        'TAG_IN_USE',
        `Cannot delete tag "${tag.slug}": ${tag._count.baskets} basket(s) still reference it`,
      );
    }

    await this.prisma.tag.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorType: 'ADMIN',
        action: 'TAG_DELETED',
        entityType: 'Tag',
        entityId: id,
        changes: { slug: tag.slug },
      },
    });

    return { success: true };
  }
}
