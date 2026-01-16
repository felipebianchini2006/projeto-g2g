import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCatalogOptionDto,
  CreateCategoryDto,
  CreateCategoryGroupDto,
  CreateCategorySectionDto,
  UpdateCatalogOptionDto,
  UpdateCategoryDto,
  UpdateCategoryGroupDto,
  UpdateCategorySectionDto,
} from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.createWithSlug('category', dto, (slug) =>
      this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          imageUrl: dto.imageUrl?.trim() || null,
        },
      }),
    );
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const data = this.buildUpdatePayload(dto);
    return this.updateWithSlug('category', id, dto, (slug) =>
      this.prisma.category.update({
        where: { id },
        data: { ...data, ...(slug ? { slug } : {}) },
      }),
    );
  }

  async deleteCategory(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  async updateCategoryImage(id: string, imageUrl: string) {
    return this.prisma.category.update({
      where: { id },
      data: { imageUrl },
    });
  }

  async listGroups(categoryId?: string) {
    return this.prisma.categoryGroup.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createGroup(dto: CreateCategoryGroupDto) {
    await this.ensureCategory(dto.categoryId);
    return this.createWithSlug('group', dto, (slug) =>
      this.prisma.categoryGroup.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          categoryId: dto.categoryId,
        },
      }),
    );
  }

  async updateGroup(id: string, dto: UpdateCategoryGroupDto) {
    if (dto.categoryId) {
      await this.ensureCategory(dto.categoryId);
    }
    const data = this.buildUpdatePayload(dto);
    return this.updateWithSlug('group', id, dto, (slug) =>
      this.prisma.categoryGroup.update({
        where: { id },
        data: { ...data, ...(slug ? { slug } : {}) },
      }),
    );
  }

  async deleteGroup(id: string) {
    return this.prisma.categoryGroup.delete({ where: { id } });
  }

  async listSections(groupId?: string) {
    return this.prisma.categorySection.findMany({
      where: groupId ? { groupId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async createSection(dto: CreateCategorySectionDto) {
    await this.ensureGroup(dto.groupId);
    return this.createWithSlug('section', dto, (slug) =>
      this.prisma.categorySection.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          groupId: dto.groupId,
        },
      }),
    );
  }

  async updateSection(id: string, dto: UpdateCategorySectionDto) {
    if (dto.groupId) {
      await this.ensureGroup(dto.groupId);
    }
    const data = this.buildUpdatePayload(dto);
    return this.updateWithSlug('section', id, dto, (slug) =>
      this.prisma.categorySection.update({
        where: { id },
        data: { ...data, ...(slug ? { slug } : {}) },
      }),
    );
  }

  async deleteSection(id: string) {
    return this.prisma.categorySection.delete({ where: { id } });
  }

  async listSalesModels() {
    return this.prisma.salesModel.findMany({ orderBy: { name: 'asc' } });
  }

  async createSalesModel(dto: CreateCatalogOptionDto) {
    return this.createWithSlug('sales model', dto, (slug) =>
      this.prisma.salesModel.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
        },
      }),
    );
  }

  async updateSalesModel(id: string, dto: UpdateCatalogOptionDto) {
    const data = this.buildUpdatePayload(dto);
    return this.updateWithSlug('sales model', id, dto, (slug) =>
      this.prisma.salesModel.update({
        where: { id },
        data: { ...data, ...(slug ? { slug } : {}) },
      }),
    );
  }

  async deleteSalesModel(id: string) {
    return this.prisma.salesModel.delete({ where: { id } });
  }

  async listOrigins() {
    return this.prisma.originOption.findMany({ orderBy: { name: 'asc' } });
  }

  async createOrigin(dto: CreateCatalogOptionDto) {
    return this.createWithSlug('origin', dto, (slug) =>
      this.prisma.originOption.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
        },
      }),
    );
  }

  async updateOrigin(id: string, dto: UpdateCatalogOptionDto) {
    const data = this.buildUpdatePayload(dto);
    return this.updateWithSlug('origin', id, dto, (slug) =>
      this.prisma.originOption.update({
        where: { id },
        data: { ...data, ...(slug ? { slug } : {}) },
      }),
    );
  }

  async deleteOrigin(id: string) {
    return this.prisma.originOption.delete({ where: { id } });
  }

  async listRecoveryOptions() {
    return this.prisma.recoveryOption.findMany({ orderBy: { name: 'asc' } });
  }

  async createRecoveryOption(dto: CreateCatalogOptionDto) {
    return this.createWithSlug('recovery', dto, (slug) =>
      this.prisma.recoveryOption.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
        },
      }),
    );
  }

  async updateRecoveryOption(id: string, dto: UpdateCatalogOptionDto) {
    const data = this.buildUpdatePayload(dto);
    return this.updateWithSlug('recovery', id, dto, (slug) =>
      this.prisma.recoveryOption.update({
        where: { id },
        data: { ...data, ...(slug ? { slug } : {}) },
      }),
    );
  }

  async deleteRecoveryOption(id: string) {
    return this.prisma.recoveryOption.delete({ where: { id } });
  }

  private buildUpdatePayload(dto: { name?: string; description?: string; imageUrl?: string }) {
    const payload: { name?: string; description?: string | null; imageUrl?: string | null } =
      {};
    if (dto.name !== undefined) {
      payload.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      payload.description = dto.description?.trim() || null;
    }
    if (dto.imageUrl !== undefined) {
      payload.imageUrl = dto.imageUrl?.trim() || null;
    }
    return payload;
  }

  private async ensureCategory(categoryId: string) {
    const exists = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!exists) {
      throw new NotFoundException('Categoria não encontrada.');
    }
  }

  private async ensureGroup(groupId: string) {
    const exists = await this.prisma.categoryGroup.findUnique({ where: { id: groupId } });
    if (!exists) {
      throw new NotFoundException('Subcategoria não encontrada.');
    }
  }

  private normalizeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private ensureSlug(value?: string, fallback?: string) {
    const source = value?.trim() || fallback?.trim();
    if (!source) {
      throw new BadRequestException('Slug inválido.');
    }
    const slug = this.normalizeSlug(source);
    if (!slug) {
      throw new BadRequestException('Slug inválido.');
    }
    return slug;
  }

  private async createWithSlug<T extends { name: string; slug?: string }>(
    label: string,
    dto: T,
    create: (slug: string) => Promise<unknown>,
  ) {
    try {
      const slug = this.ensureSlug(dto.slug, dto.name);
      return await create(slug);
    } catch (error) {
      this.handleUniqueSlugError(error, label);
    }
  }

  private async updateWithSlug<T extends { name?: string; slug?: string }>(
    label: string,
    id: string,
    dto: T,
    update: (slug?: string) => Promise<unknown>,
  ) {
    try {
      const slug = dto.slug ? this.ensureSlug(dto.slug, dto.name) : undefined;
      return await update(slug);
    } catch (error) {
      this.handleUniqueSlugError(error, label);
    }
  }

  private handleUniqueSlugError(error: unknown, label: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException(`Slug ja usado para ${label}.`);
    }
    throw error;
  }
}
