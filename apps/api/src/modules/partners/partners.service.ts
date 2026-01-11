import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Partner } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

type PartnerClickMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeSlug(value: string) {
    return value.trim().toLowerCase();
  }

  async createPartner(dto: CreatePartnerDto) {
    const slug = this.normalizeSlug(dto.slug);
    return this.prisma.partner.create({
      data: {
        name: dto.name.trim(),
        slug,
        commissionBps: dto.commissionBps ?? undefined,
        active: dto.active ?? true,
      },
    });
  }

  async listPartners() {
    return this.prisma.partner.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async updatePartner(id: string, dto: UpdatePartnerDto) {
    const data: Prisma.PartnerUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.slug !== undefined) {
      data.slug = this.normalizeSlug(dto.slug);
    }
    if (dto.commissionBps !== undefined) {
      data.commissionBps = dto.commissionBps;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update.');
    }
    return this.prisma.partner.update({ where: { id }, data });
  }

  async getPartnerStats(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Partner not found.');
    }

    const [clicks, orders, commission] = await Promise.all([
      this.prisma.partnerClick.count({ where: { partnerId: id } }),
      this.prisma.orderAttribution.count({ where: { partnerId: id } }),
      this.prisma.partnerCommissionEvent.aggregate({
        where: { partnerId: id },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      partnerId: id,
      clicks,
      orders,
      commissionCents: commission._sum.amountCents ?? 0,
    };
  }

  async findActiveBySlug(slug: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const normalized = this.normalizeSlug(slug);
    return client.partner.findFirst({
      where: { slug: normalized, active: true },
    });
  }

  async trackClick(slug: string, meta: PartnerClickMeta) {
    if (!slug.trim()) {
      return { tracked: false };
    }
    const partner = await this.prisma.partner.findFirst({
      where: { slug: this.normalizeSlug(slug), active: true },
    });
    if (!partner) {
      return { tracked: false };
    }
    await this.prisma.partnerClick.create({
      data: {
        partnerId: partner.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return { tracked: true };
  }
}
