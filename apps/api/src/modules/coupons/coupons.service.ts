import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCode(value: string) {
    return value.trim().toUpperCase();
  }

  private parseDate(value?: string | null) {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date value.');
    }
    return parsed;
  }

  private ensureDiscount(dto: { discountBps?: number | null; discountCents?: number | null }) {
    if (!dto.discountBps && !dto.discountCents) {
      throw new BadRequestException('Coupon must have a discount.');
    }
    if (dto.discountBps && dto.discountCents) {
      throw new BadRequestException('Coupon cannot have both discount types.');
    }
  }

  async createCoupon(dto: CreateCouponDto) {
    this.ensureDiscount(dto);
    const code = this.normalizeCode(dto.code);

    if (dto.partnerId) {
      const partner = await this.prisma.partner.findUnique({ where: { id: dto.partnerId } });
      if (!partner) {
        throw new BadRequestException('Partner not found.');
      }
      if (!partner.active) {
        throw new BadRequestException('Partner is inactive.');
      }
    }

    return this.prisma.coupon.create({
      data: {
        code,
        partnerId: dto.partnerId ?? null,
        active: dto.active ?? true,
        discountBps: dto.discountBps ?? null,
        discountCents: dto.discountCents ?? null,
        startsAt: this.parseDate(dto.startsAt),
        endsAt: this.parseDate(dto.endsAt),
        maxUses: dto.maxUses ?? null,
      },
      include: { partner: true },
    });
  }

  async listCoupons() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { partner: true },
    });
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const data: Prisma.CouponUncheckedUpdateInput = {};
    if (dto.code !== undefined) {
      data.code = this.normalizeCode(dto.code);
    }
    if (dto.partnerId !== undefined) {
      if (dto.partnerId) {
        const partner = await this.prisma.partner.findUnique({ where: { id: dto.partnerId } });
        if (!partner) {
          throw new BadRequestException('Partner not found.');
        }
        if (!partner.active) {
          throw new BadRequestException('Partner is inactive.');
        }
      }
      data.partnerId = dto.partnerId;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    if (dto.discountBps !== undefined || dto.discountCents !== undefined) {
      this.ensureDiscount({
        discountBps: dto.discountBps ?? null,
        discountCents: dto.discountCents ?? null,
      });
      data.discountBps = dto.discountBps ?? null;
      data.discountCents = dto.discountCents ?? null;
    }
    if (dto.startsAt !== undefined) {
      data.startsAt = this.parseDate(dto.startsAt);
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = this.parseDate(dto.endsAt);
    }
    if (dto.maxUses !== undefined) {
      data.maxUses = dto.maxUses ?? null;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update.');
    }
    return this.prisma.coupon.update({
      where: { id },
      data,
      include: { partner: true },
    });
  }

  async getValidCoupon(code: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const normalized = this.normalizeCode(code);
    const coupon = await client.coupon.findUnique({
      where: { code: normalized },
      include: { partner: true },
    });
    if (!coupon || !coupon.active) {
      throw new BadRequestException('Coupon unavailable.');
    }
    if (coupon.partnerId && coupon.partner && !coupon.partner.active) {
      throw new BadRequestException('Partner is inactive.');
    }
    if (!coupon.discountBps && !coupon.discountCents) {
      throw new BadRequestException('Coupon unavailable.');
    }
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) {
      throw new BadRequestException('Coupon not active yet.');
    }
    if (coupon.endsAt && coupon.endsAt.getTime() < now.getTime()) {
      throw new BadRequestException('Coupon expired.');
    }
    if (coupon.maxUses !== null && coupon.maxUses !== undefined) {
      if (coupon.usesCount >= coupon.maxUses) {
        throw new BadRequestException('Coupon usage limit reached.');
      }
    }
    return coupon;
  }

  async consumeCouponUsage(
    coupon: { id: string; maxUses?: number | null },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    if (!coupon.maxUses) {
      await client.coupon.update({
        where: { id: coupon.id },
        data: { usesCount: { increment: 1 } },
      });
      return;
    }
    const updated = await client.coupon.updateMany({
      where: { id: coupon.id, usesCount: { lt: coupon.maxUses } },
      data: { usesCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new BadRequestException('Coupon usage limit reached.');
    }
  }

  async getCouponOrThrow(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id }, include: { partner: true } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found.');
    }
    return coupon;
  }
}
