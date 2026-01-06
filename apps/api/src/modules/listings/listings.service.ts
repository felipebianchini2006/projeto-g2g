import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DeliveryType, ListingStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

type AuditMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.listing.update({
      where: { id: listing.id },
      data,
    });
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

    return this.prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.PENDING },
    });
  }

  async archiveListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, sellerId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return this.prisma.listing.update({
      where: { id: listing.id },
      data: { status: ListingStatus.SUSPENDED },
    });
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

      return updated;
    });
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
