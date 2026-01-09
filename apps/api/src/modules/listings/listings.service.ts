import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DeliveryType, ListingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { PublicListingQueryDto, PublicListingSort } from './dto/public-listing-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

type AuditMeta = {
  ip?: string;
  userAgent?: string;
};

type PublicListing = {
  id: string;
  title: string;
  description: string | null;
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
  listingsCount: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicCacheTtlMs = 60_000;
  private readonly publicListingCache = new Map<string, CacheEntry<PublicListing>>();
  private publicCategoriesCache?: CacheEntry<PublicCategory[]>;

  async listPublicListings(query?: PublicListingQueryDto): Promise<PublicListing[]> {
    const filters = query ?? new PublicListingQueryDto();
    const andFilters: Prisma.ListingWhereInput[] = [];

    if (filters.category) {
      andFilters.push({
        OR: [
          { categoryId: filters.category },
          { category: { slug: filters.category } },
        ],
      });
    }

    if (filters.deliveryType) {
      andFilters.push({ deliveryType: filters.deliveryType });
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

    const orderBy =
      filters.sort === PublicListingSort.PriceAsc
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
      },
      orderBy,
      skip: filters.skip,
      take: filters.take ?? 20,
    });

    return listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
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
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const payload = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
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
    const countsByCategory = new Map(
      counts.map((item) => [item.categoryId, item._count._all]),
    );

    const payload = categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      listingsCount: countsByCategory.get(category.id) ?? 0,
    }));

    this.publicCategoriesCache = {
      value: payload,
      expiresAt: Date.now() + this.publicCacheTtlMs,
    };

    return payload;
  }

  async createListing(sellerId: string, dto: CreateListingDto) {
    return this.prisma.listing.create({
      data: {
        sellerId,
        categoryId: dto.categoryId,
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
  }

  async listSellerListings(sellerId: string, query: ListingQueryDto) {
    return this.prisma.listing.findMany({
      where: {
        sellerId,
        status: query.status,
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take ?? 20,
    });
  }

  async listAdminListings(query: ListingQueryDto) {
    return this.prisma.listing.findMany({
      where: {
        status: query.status,
      },
      include: {
        seller: { select: { id: true, email: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take ?? 50,
    });
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

    const data: UpdateListingDto & { status?: ListingStatus } = {
      ...dto,
    };

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

    if (listing.status !== ListingStatus.DRAFT) {
      throw new BadRequestException('Only draft listings can be submitted.');
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

      await this.createAuditLog(tx, adminId, listing.id, {
        action: AuditAction.UPDATE,
        reason: 'approved',
        from: listing.status,
        to: updated.status,
      }, meta);

      this.invalidatePublicCaches();
      return updated;
    });
  }

  async rejectListing(listingId: string, adminId: string, reason: string | undefined, meta: AuditMeta) {
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

      await this.createAuditLog(tx, adminId, listing.id, {
        action: AuditAction.UPDATE,
        reason,
        from: listing.status,
        to: updated.status,
      }, meta);

      this.invalidatePublicCaches();
      return updated;
    });
  }

  async suspendListing(listingId: string, adminId: string, reason: string | undefined, meta: AuditMeta) {
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

      await this.createAuditLog(tx, adminId, listing.id, {
        action: AuditAction.UPDATE,
        reason,
        from: listing.status,
        to: updated.status,
      }, meta);

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
}
