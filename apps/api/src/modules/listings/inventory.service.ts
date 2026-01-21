import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryType, InventoryStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { InventoryUpdateDto } from './dto/inventory-update.dto';

type ReserveOptions = {
  holdMs?: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) { }

  async addInventoryItems(sellerId: string, listingId: string, codes: string[]) {
    const listing = await this.ensureAutoListing(sellerId, listingId);
    const normalized = this.normalizeCodes(codes);

    if (normalized.length === 0) {
      throw new BadRequestException('No inventory codes provided.');
    }

    const existing = await this.prisma.inventoryItem.findMany({
      where: { listingId: listing.id, code: { in: normalized } },
      select: { code: true },
    });

    const existingCodes = new Set(existing.map((item) => item.code));
    const toCreate = normalized.filter((code) => !existingCodes.has(code));

    if (toCreate.length === 0) {
      return { created: 0, skipped: normalized.length };
    }

    const result = await this.prisma.inventoryItem.createMany({
      data: toCreate.map((code) => ({
        listingId: listing.id,
        code,
        status: InventoryStatus.AVAILABLE,
      })),
    });

    return { created: result.count, skipped: normalized.length - result.count };
  }

  async importInventoryItems(sellerId: string, listingId: string, payload: string) {
    const codes = this.parsePayload(payload);
    return this.addInventoryItems(sellerId, listingId, codes);
  }

  async removeInventoryItem(sellerId: string, listingId: string, itemId: string) {
    await this.ensureAutoListing(sellerId, listingId);

    const result = await this.prisma.inventoryItem.updateMany({
      where: { id: itemId, listingId },
      data: { status: InventoryStatus.DISABLED },
    });

    if (result.count === 0) {
      throw new NotFoundException('Inventory item not found.');
    }

    return { removed: result.count };
  }

  async listInventoryItems(sellerId: string, listingId: string) {
    await this.ensureAutoListing(sellerId, listingId);
    return this.prisma.inventoryItem.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        status: true,
        orderItemId: true,
        reservedAt: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateInventoryItem(
    sellerId: string,
    listingId: string,
    itemId: string,
    dto: InventoryUpdateDto,
  ) {
    await this.ensureAutoListing(sellerId, listingId);
    const data: Prisma.InventoryItemUpdateInput = {};

    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) {
        throw new BadRequestException('Code is required.');
      }
      const existing = await this.prisma.inventoryItem.findFirst({
        where: { listingId, code, NOT: { id: itemId } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Inventory code already exists.');
      }
      data.code = code;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === InventoryStatus.DELIVERED) {
        data.deliveredAt = new Date();
      } else {
        data.deliveredAt = null;
      }
      if (dto.status === InventoryStatus.AVAILABLE) {
        data.reservedAt = null;
        data.orderItem = { disconnect: true };
      }
    }

    const result = await this.prisma.inventoryItem.updateMany({
      where: { id: itemId, listingId },
      data,
    });

    if (result.count === 0) {
      throw new NotFoundException('Inventory item not found.');
    }

    return this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
  }

  async reserveInventoryItem(listingId: string, orderItemId: string, options?: ReserveOptions) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }
    if (listing.deliveryType !== DeliveryType.AUTO) {
      throw new BadRequestException('Inventory reservation is only available for AUTO listings.');
    }

    return this.prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItemSnapshot.findUnique({ where: { id: orderItemId } });
      if (!orderItem) {
        throw new NotFoundException('Order item not found.');
      }
      if (orderItem.listingId && orderItem.listingId !== listingId) {
        throw new BadRequestException('Order item does not belong to this listing.');
      }

      const existingReservation = await tx.inventoryItem.findFirst({
        where: { orderItemId },
      });
      if (existingReservation) {
        if (existingReservation.listingId !== listingId) {
          throw new BadRequestException('Order item already reserved in another listing.');
        }
        return existingReservation;
      }

      const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id"
        FROM "inventory_items"
        WHERE "listingId" = ${listingId}
          AND "status" = 'AVAILABLE'
          AND "orderItemId" IS NULL
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `);

      const [row] = rows;
      if (!row) {
        throw new ConflictException('No inventory available.');
      }

      if (options?.holdMs) {
        await new Promise((resolve) => setTimeout(resolve, options.holdMs));
      }

      return tx.inventoryItem.update({
        where: { id: row.id },
        data: {
          status: InventoryStatus.RESERVED,
          orderItemId,
          reservedAt: new Date(),
        },
      });
    });
  }

  private async ensureAutoListing(sellerId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    if (listing.sellerId !== sellerId) {
      // Allow Admin override
      const user = await this.prisma.user.findUnique({ where: { id: sellerId } });
      if (user?.role !== 'ADMIN') {
        throw new NotFoundException('Listing not found.');
      }
    }

    if (listing.deliveryType !== DeliveryType.AUTO) {
      throw new BadRequestException('Inventory is only available for AUTO listings.');
    }

    return listing;
  }

  private normalizeCodes(codes: string[]) {
    return Array.from(new Set(codes.map((code) => code.trim()).filter((code) => code.length > 0)));
  }

  private parsePayload(payload: string) {
    return payload
      .split(/[\n,;]+/)
      .map((code) => code.trim())
      .filter((code) => code.length > 0);
  }
}
