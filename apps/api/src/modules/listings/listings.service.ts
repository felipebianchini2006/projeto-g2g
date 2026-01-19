import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DeliveryType, ListingStatus, Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { AdminHomeFlagsDto } from './dto/admin-home-flags.dto';
import { PublicListingQueryDto, PublicListingSort } from './dto/public-listing-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

type AuditMeta = {
  ip?: string;
  userAgent?: string;
};

type PublicListing = {
  id: string;
  sellerId: string;
  title: string;
  description: string | null;
  origin?: { id: string; name: string; slug: string } | null;
  recoveryOption?: { id: string; name: string; slug: string } | null;
  priceCents: number;
  currency: string;
  status: ListingStatus;
  deliveryType: DeliveryType;
  deliverySlaHours: number;
  refundPolicy: string;
  media: { id: string; url: string; type: string; position: number }[];
  categorySlug?: string;
  categoryLabel?: string;
  createdAt: Date;
};

type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  listingsCount: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) { }

  private readonly publicCacheTtlMs = 60_000;
  private readonly publicListingCache = new Map<string, CacheEntry<PublicListing>>();
  private publicCategoriesCache?: CacheEntry<PublicCategory[]>;

  async listPublicListings(query?: PublicListingQueryDto): Promise<PublicListing[]> {
    const filters = query ?? new PublicListingQueryDto();
    const andFilters: Prisma.ListingWhereInput[] = [];

    if (filters.category) {
      andFilters.push({
        OR: [{ categoryId: filters.category }, { category: { slug: filters.category } }],
      });
    }

    if (filters.deliveryType) {
      andFilters.push({ deliveryType: filters.deliveryType });
    }

    if (filters.seller) {
      andFilters.push({ sellerId: filters.seller });
    }

    if (filters.q?.trim()) {
      const search = filters.q.trim();
      andFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (typeof filters.minPriceCents === 'number' || typeof filters.maxPriceCents === 'number') {
      andFilters.push({
        priceCents: {
          gte: filters.minPriceCents ?? 0,
          lte: filters.maxPriceCents ?? 2_147_483_647,
        },
      });
    }

    if (filters.featured) {
      andFilters.push({ featuredAt: { not: null } });
    }

    if (filters.mustHave) {
      andFilters.push({ mustHaveAt: { not: null } });
    }

    const orderBy = filters.featured
      ? [{ featuredAt: 'desc' as const }, { createdAt: 'desc' as const }]
      : filters.mustHave
        ? [{ mustHaveAt: 'desc' as const }, { createdAt: 'desc' as const }]
        : filters.sort === PublicListingSort.PriceAsc
          ? { priceCents: 'asc' as const }
          : filters.sort === PublicListingSort.PriceDesc
            ? { priceCents: 'desc' as const }
            : filters.sort === PublicListingSort.Title
              ? { title: 'asc' as const }
              : { createdAt: 'desc' as const };

    const listings = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        ...(andFilters.length > 0 ? { AND: andFilters } : {}),
      },
      include: {
        media: { orderBy: { position: 'asc' } },
        category: { select: { slug: true, name: true } },
        origin: { select: { id: true, name: true, slug: true } },
        recoveryOption: { select: { id: true, name: true, slug: true } },
      },
      orderBy,
      skip: filters.skip,
      take: filters.take ?? 20,
    });

    return listings.map((listing) => ({
      id: listing.id,
      sellerId: listing.sellerId,
      title: listing.title,
      description: listing.description,
      origin: listing.origin ?? null,
      recoveryOption: listing.recoveryOption ?? null,
      priceCents: listing.priceCents,
      currency: listing.currency,
      status: listing.status,
      deliveryType: listing.deliveryType,
      deliverySlaHours: listing.deliverySlaHours,
      refundPolicy: listing.refundPolicy,
      media: listing.media,
      categorySlug: listing.category?.slug ?? undefined,
      categoryLabel: listing.category?.name ?? undefined,
      createdAt: listing.createdAt,
    }));
  }

  async getPublicListing(listingId: string): Promise<PublicListing> {
    const cached = this.getCached(this.publicListingCache, listingId);
    if (cached) {
      return cached;
    }

    const listing = await this.prisma.listing.findFirst({
      where: {
        status: ListingStatus.PUBLISHED,
        OR: [{ id: listingId }, { slug: listingId }],
      },
      include: {
        media: { orderBy: { position: 'asc' } },
        category: { select: { slug: true, name: true } },
        origin: { select: { id: true, name: true, slug: true } },
        recoveryOption: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const payload = {
      id: listing.id,
      sellerId: listing.sellerId,
      title: listing.title,
      description: listing.description,
      origin: listing.origin ?? null,
      recoveryOption: listing.recoveryOption ?? null,
      priceCents: listing.priceCents,
      currency: listing.currency,
      status: listing.status,
      deliveryType: listing.deliveryType,
      deliverySlaHours: listing.deliverySlaHours,
      refundPolicy: listing.refundPolicy,
      media: listing.media,
      categorySlug: listing.category?.slug ?? undefined,
      categoryLabel: listing.category?.name ?? undefined,
      createdAt: listing.createdAt,
    };

    this.setCached(this.publicListingCache, listing.id, payload);
    if (listing.slug) {
      this.setCached(this.publicListingCache, listing.slug, payload);
    }

    return payload;
  }

  async listPublicCategories(): Promise<PublicCategory[]> {
    if (this.publicCategoriesCache && this.publicCategoriesCache.expiresAt > Date.now()) {
      return this.publicCategoriesCache.value;
    }

    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    const counts = await this.prisma.listing.groupBy({
      by: ['categoryId'],
      where: { status: ListingStatus.PUBLISHED },
      _count: { _all: true },
    });
    const countsByCategory = new Map(counts.map((item) => [item.categoryId, item._count._all]));

    const payload = categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      imageUrl: category.imageUrl,
      listingsCount: countsByCategory.get(category.id) ?? 0,
    }));

    this.publicCategoriesCache = {
      value: payload,
      expiresAt: Date.now() + this.publicCacheTtlMs,
    };

    return payload;
  }

  async createListing(sellerId: string, dto: CreateListingDto) {
    const catalog = await this.resolveCategoryLinks(
      dto.categoryId,
      dto.categoryGroupId,
      dto.categorySectionId,
    );
    await this.ensureOptionExists('salesModel', dto.salesModelId);
    await this.ensureOptionExists('origin', dto.originId);
    await this.ensureOptionExists('recoveryOption', dto.recoveryOptionId);

    return this.prisma.listing.create({
      data: {
        sellerId,
        categoryId: dto.categoryId,
        categoryGroupId: catalog.groupId ?? undefined,
        categorySectionId: catalog.sectionId ?? undefined,
        salesModelId: dto.salesModelId,
        originId: dto.originId,
        recoveryOptionId: dto.recoveryOptionId,
        title: dto.title,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency,
        platformFeeBps: dto.platformFeeBps,
        deliveryType: dto.deliveryType,
        deliverySlaHours: dto.deliverySlaHours,
        refundPolicy: dto.refundPolicy,
        status: ListingStatus.DRAFT,
      },
    });
  }

  async listSellerListings(sellerId: string, query: ListingQueryDto) {
    const listings = await this.prisma.listing.findMany({
      where: {
        sellerId,
        status: query.status,
      },
      include: {
        media: { orderBy: { position: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take ?? 20,
    });
    const listingIds = listings.map((listing) => listing.id);
    const inventoryCounts =
      listingIds.length > 0
        ? await this.prisma.inventoryItem.groupBy({
          by: ['listingId'],
          where: { listingId: { in: listingIds }, status: 'AVAILABLE' },
          _count: { _all: true },
        })
        : [];
    const countsByListingId = new Map(
      inventoryCounts.map((item) => [item.listingId, item._count._all]),
    );

    return listings.map((listing) => ({
      ...listing,
      inventoryAvailableCount: countsByListingId.get(listing.id) ?? 0,
    }));
  }

  async listAdminListings(query: ListingQueryDto) {
    return this.prisma.listing.findMany({
      where: {
        status: query.status,
      },
      include: {
        seller: { select: { id: true, email: true } },
        category: { select: { id: true, name: true, slug: true } },
        categoryGroup: { select: { id: true, name: true, slug: true } },
        categorySection: { select: { id: true, name: true, slug: true } },
        salesModel: { select: { id: true, name: true, slug: true } },
        origin: { select: { id: true, name: true, slug: true } },
        recoveryOption: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take ?? 50,
    });
  }

  async createListingAsAdmin(
    adminId: string,
    dto: CreateListingDto & { sellerId: string },
    meta: AuditMeta,
  ) {
    const seller = await this.prisma.user.findUnique({ where: { id: dto.sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found.');
    }
    if (seller.role !== UserRole.SELLER) {
      throw new BadRequestException('Seller must have role SELLER.');
    }

    const catalog = await this.resolveCategoryLinks(
      dto.categoryId,
      dto.categoryGroupId,
      dto.categorySectionId,
    );
    await this.ensureOptionExists('salesModel', dto.salesModelId);
    await this.ensureOptionExists('origin', dto.originId);
    await this.ensureOptionExists('recoveryOption', dto.recoveryOptionId);

    const created = await this.prisma.listing.create({
      data: {
        sellerId: dto.sellerId,
        categoryId: dto.categoryId,
        categoryGroupId: catalog.groupId ?? undefined,
        categorySectionId: catalog.sectionId ?? undefined,
        salesModelId: dto.salesModelId,
        originId: dto.originId,
        recoveryOptionId: dto.recoveryOptionId,
        title: dto.title,
        description: dto.description,
        priceCents: dto.priceCents,
        currency: dto.currency,
        deliveryType: dto.deliveryType,
        deliverySlaHours: dto.deliverySlaHours,
        refundPolicy: dto.refundPolicy,
        status: ListingStatus.DRAFT,
      },
    });

    await this.createAuditLog(
      this.prisma,
      adminId,
      created.id,
      {
        action: AuditAction.CREATE,
        reason: 'admin create',
        from: ListingStatus.DRAFT,
        to: created.status,
      },
      meta,
    );

    return created;
  }

  async getSellerListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, sellerId },
      include: { media: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return listing;
  }

  async updateListing(sellerId: string, listingId: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, sellerId },
      include: { inventoryItems: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    if (listing.status === ListingStatus.SUSPENDED) {
      throw new BadRequestException('Suspended listings cannot be edited.');
    }

    if (dto.deliveryType === DeliveryType.MANUAL && listing.inventoryItems.length > 0) {
      throw new BadRequestException('Remove inventory before switching to manual delivery.');
    }

    const data: UpdateListingDto & {
      status?: ListingStatus;
      categoryGroupId?: string | null;
      categorySectionId?: string | null;
      salesModelId?: string | null;
      originId?: string | null;
      recoveryOptionId?: string | null;
    } = {
      ...dto,
    };

    const categoryId = dto.categoryId ?? listing.categoryId;
    const shouldValidateCategory =
      dto.categoryId !== undefined ||
      dto.categoryGroupId !== undefined ||
      dto.categorySectionId !== undefined;
    if (shouldValidateCategory) {
      const catalog = await this.resolveCategoryLinks(
        categoryId,
        dto.categoryGroupId ?? listing.categoryGroupId ?? undefined,
        dto.categorySectionId ?? listing.categorySectionId ?? undefined,
      );
      if (dto.categoryGroupId !== undefined || dto.categorySectionId !== undefined) {
        data.categoryGroupId = catalog.groupId ?? undefined;
        data.categorySectionId = catalog.sectionId ?? undefined;
      }
    }

    if (dto.salesModelId !== undefined) {
      await this.ensureOptionExists('salesModel', dto.salesModelId);
      data.salesModelId = dto.salesModelId ?? null;
    }
    if (dto.originId !== undefined) {
      await this.ensureOptionExists('origin', dto.originId);
      data.originId = dto.originId ?? null;
    }
    if (dto.recoveryOptionId !== undefined) {
      await this.ensureOptionExists('recoveryOption', dto.recoveryOptionId);
      data.recoveryOptionId = dto.recoveryOptionId ?? null;
    }

    if (listing.status === ListingStatus.PUBLISHED) {
      data.status = ListingStatus.PENDING;
    }

    const updated = await this.prisma.listing.update({
      where: { id: listing.id },
      data,
    });

    this.invalidatePublicCaches();
    return updated;
  }

  async submitListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, sellerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const allowedStatuses: ListingStatus[] = [ListingStatus.DRAFT, ListingStatus.SUSPENDED];
    if (!allowedStatuses.includes(listing.status)) {
      throw new BadRequestException('Only draft or suspended listings can be submitted.');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.PENDING },
    });

    this.invalidatePublicCaches();
    return updated;
  }

  async archiveListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, sellerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.SUSPENDED },
    });

    this.invalidatePublicCaches();
    return updated;
  }

  async approveListing(listingId: string, adminId: string, meta: AuditMeta) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        throw new NotFoundException('Listing not found.');
      }
      if (listing.status !== ListingStatus.PENDING) {
        throw new BadRequestException('Only pending listings can be approved.');
      }

      const updated = await tx.listing.update({
        where: { id: listing.id },
        data: { status: ListingStatus.PUBLISHED },
      });

      await this.createAuditLog(
        tx,
        adminId,
        listing.id,
        {
          action: AuditAction.UPDATE,
          reason: 'approved',
          from: listing.status,
          to: updated.status,
        },
        meta,
      );

      this.invalidatePublicCaches();
      return updated;
    });
  }

  async rejectListing(
    listingId: string,
    adminId: string,
    reason: string | undefined,
    meta: AuditMeta,
  ) {
    if (!reason) {
      throw new BadRequestException('Rejection reason is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        throw new NotFoundException('Listing not found.');
      }
      if (listing.status !== ListingStatus.PENDING) {
        throw new BadRequestException('Only pending listings can be rejected.');
      }

      const updated = await tx.listing.update({
        where: { id: listing.id },
        data: { status: ListingStatus.DRAFT },
      });

      await this.createAuditLog(
        tx,
        adminId,
        listing.id,
        {
          action: AuditAction.UPDATE,
          reason,
          from: listing.status,
          to: updated.status,
        },
        meta,
      );

      this.invalidatePublicCaches();
      return updated;
    });
  }

  async suspendListing(
    listingId: string,
    adminId: string,
    reason: string | undefined,
    meta: AuditMeta,
  ) {
    if (!reason) {
      throw new BadRequestException('Suspension reason is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        throw new NotFoundException('Listing not found.');
      }

      const updated = await tx.listing.update({
        where: { id: listing.id },
        data: { status: ListingStatus.SUSPENDED },
      });

      await this.createAuditLog(
        tx,
        adminId,
        listing.id,
        {
          action: AuditAction.UPDATE,
          reason,
          from: listing.status,
          to: updated.status,
        },
        meta,
      );

      this.invalidatePublicCaches();
      return updated;
    });
  }



  async deleteListing(listingId: string, adminId: string, meta: AuditMeta) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    try {
      const deleted = await this.prisma.listing.delete({
        where: { id: listingId },
      });

      await this.createAuditLog(
        this.prisma,
        adminId,
        listingId, // Note: The entity is gone, but we log the ID.
        {
          action: AuditAction.DELETE,
          reason: 'admin delete',
          from: listing.status,
          to: listing.status, // Not changing status, just deleting
        },
        meta,
      );

      this.invalidatePublicCaches();
      return deleted;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException(
          'Cannot delete listing with associated orders. Please suspend it instead.',
        );
      }
      throw error;
    }
  }

  async updateListingHomeFlags(
    listingId: string,
    adminId: string,
    dto: AdminHomeFlagsDto,
    meta: AuditMeta,
  ) {
    if (dto.featured === undefined && dto.mustHave === undefined) {
      throw new BadRequestException('No changes requested.');
    }

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing) {
        throw new NotFoundException('Listing not found.');
      }

      const data: Prisma.ListingUpdateInput = {};
      if (dto.featured !== undefined) {
        data.featuredAt = dto.featured ? new Date() : null;
      }
      if (dto.mustHave !== undefined) {
        data.mustHaveAt = dto.mustHave ? new Date() : null;
      }

      const updated = await tx.listing.update({
        where: { id: listing.id },
        data,
      });

      await this.createAuditLog(
        tx,
        adminId,
        listing.id,
        {
          action: AuditAction.UPDATE,
          reason: 'home flags',
          from: listing.status,
          to: listing.status,
        },
        meta,
      );

      this.invalidatePublicCaches();
      return updated;
    });
  }

  private getCached<T>(cache: Map<string, CacheEntry<T>>, key: string) {
    const entry = cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
    cache.set(key, { value, expiresAt: Date.now() + this.publicCacheTtlMs });
  }

  private invalidatePublicCaches() {
    this.publicListingCache.clear();
    this.publicCategoriesCache = undefined;
  }

  private async createAuditLog(
    tx: Prisma.TransactionClient,
    adminId: string,
    entityId: string,
    payload: { action: AuditAction; reason: string; from: ListingStatus; to: ListingStatus },
    meta: AuditMeta,
  ) {
    await tx.auditLog.create({
      data: {
        adminId,
        action: payload.action,
        entityType: 'listing',
        entityId,
        ip: meta.ip,
        userAgent: meta.userAgent,
        payload,
      },
    });
  }

  private async resolveCategoryLinks(
    categoryId: string,
    groupId?: string,
    sectionId?: string,
  ) {
    let resolvedGroupId = groupId;
    if (resolvedGroupId) {
      const group = await this.prisma.categoryGroup.findUnique({
        where: { id: resolvedGroupId },
      });
      if (!group) {
        throw new NotFoundException('Subcategoria não encontrada.');
      }
      if (group.categoryId !== categoryId) {
        throw new BadRequestException('Subcategoria não pertence à categoria.');
      }
    }

    if (sectionId) {
      const section = await this.prisma.categorySection.findUnique({
        where: { id: sectionId },
      });
      if (!section) {
        throw new NotFoundException('Seção não encontrada.');
      }
      if (resolvedGroupId && section.groupId !== resolvedGroupId) {
        throw new BadRequestException('Seção não pertence à subcategoria.');
      }
      if (!resolvedGroupId) {
        const group = await this.prisma.categoryGroup.findUnique({
          where: { id: section.groupId },
        });
        if (!group) {
          throw new NotFoundException('Subcategoria não encontrada.');
        }
        if (group.categoryId !== categoryId) {
          throw new BadRequestException('Seção não pertence à categoria.');
        }
        resolvedGroupId = section.groupId;
      }
    }

    return { groupId: resolvedGroupId, sectionId };
  }

  private async ensureOptionExists(
    option: 'salesModel' | 'origin' | 'recoveryOption',
    id?: string,
  ) {
    if (!id) {
      return;
    }
    const exists =
      option === 'salesModel'
        ? await this.prisma.salesModel.findUnique({ where: { id } })
        : option === 'origin'
          ? await this.prisma.originOption.findUnique({ where: { id } })
          : await this.prisma.recoveryOption.findUnique({ where: { id } });
    if (!exists) {
      const label =
        option === 'salesModel'
          ? 'Tipo de venda'
          : option === 'origin'
            ? 'Procedência'
            : 'Dados de recuperação';
      throw new NotFoundException(`${label} não encontrado.`);
    }
  }
}
