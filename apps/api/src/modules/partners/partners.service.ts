import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, PartnerCommissionEventType, PartnerPayoutStatus, Prisma, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { RequestPartnerPayoutDto } from './dto/request-partner-payout.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

type PartnerClickMeta = {
  ip?: string;
  userAgent?: string;
};

type AuditMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) { }

  normalizeSlug(value: string) {
    return value.trim().toLowerCase();
  }

  async createPartner(dto: CreatePartnerDto, adminId?: string, meta?: AuditMeta) {
    const slug = this.normalizeSlug(dto.slug);
    const ownerEmail = dto.ownerEmail?.trim().toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      let ownerUserId: string | null = null;
      if (ownerEmail) {
        const owner = await tx.user.findUnique({ where: { email: ownerEmail } });
        if (!owner) {
          throw new BadRequestException('User not found for the provided owner email.');
        }
        ownerUserId = owner.id;
      }

      const partner = await tx.partner.create({
        data: {
          name: dto.name.trim(),
          slug,
          commissionBps: dto.commissionBps ?? undefined,
          active: dto.active ?? true,
          owner: ownerUserId ? { connect: { id: ownerUserId } } : undefined,
          ownerEmail: ownerEmail ?? undefined,
        },
      });

      if (ownerEmail && adminId) {
        await tx.auditLog.create({
          data: {
            adminId,
            action: AuditAction.PERMISSION_CHANGE,
            entityType: 'Partner',
            entityId: partner.id,
            ip: meta?.ip,
            userAgent: meta?.userAgent,
            payload: {
              ownerEmail,
              ownerUserId,
            },
          },
        });
      }

      return partner;
    });
  }

  async listPartners() {
    return this.prisma.partner.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updatePartner(id: string, dto: UpdatePartnerDto, adminId?: string, meta?: AuditMeta) {
    const data: Prisma.PartnerUpdateInput = {};
    const ownerEmail = dto.ownerEmail?.trim().toLowerCase();
    let ownerUserId: string | null = null;
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
    if (ownerEmail) {
      const owner = await this.prisma.user.findUnique({ where: { email: ownerEmail } });
      if (!owner) {
        throw new BadRequestException('User not found for the provided owner email.');
      }
      ownerUserId = owner.id;
      data.owner = { connect: { id: ownerUserId } };
      data.ownerEmail = ownerEmail;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update.');
    }
    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.update({ where: { id }, data });
      if (ownerEmail && adminId) {
        await tx.auditLog.create({
          data: {
            adminId,
            action: AuditAction.PERMISSION_CHANGE,
            entityType: 'Partner',
            entityId: id,
            ip: meta?.ip,
            userAgent: meta?.userAgent,
            payload: {
              ownerEmail,
              ownerUserId,
            },
          },
        });
      }
      return partner;
    });
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

  async listOwnedPartners(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return this.prisma.partner.findMany({
      where: user?.email
        ? {
            OR: [
              { ownerUserId: userId },
              { ownerEmail: { equals: user.email, mode: 'insensitive' } },
            ],
          }
        : { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartnerStatsForUser(partnerId: string, userId: string, role: UserRole) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: { coupons: true },
    });
    if (!partner) {
      throw new NotFoundException('Partner not found.');
    }
    await this.assertPartnerAccess(partner.ownerUserId, partner.ownerEmail, userId, role);

    const [clicks, orders, earned, reversed, paid] = await Promise.all([
      this.prisma.partnerClick.count({ where: { partnerId } }),
      this.prisma.orderAttribution.count({ where: { partnerId } }),
      this.prisma.partnerCommissionEvent.aggregate({
        where: { partnerId, type: PartnerCommissionEventType.EARNED },
        _sum: { amountCents: true },
      }),
      this.prisma.partnerCommissionEvent.aggregate({
        where: { partnerId, type: PartnerCommissionEventType.REVERSED },
        _sum: { amountCents: true },
      }),
      this.prisma.partnerPayout.aggregate({
        where: { partnerId, status: PartnerPayoutStatus.PAID },
        _sum: { amountCents: true },
      }),
    ]);

    const earnedCents = earned._sum.amountCents ?? 0;
    const reversedCents = Math.abs(reversed._sum.amountCents ?? 0);
    const paidCents = paid._sum.amountCents ?? 0;
    const commissionCents = earnedCents - reversedCents;
    const balanceCents = commissionCents - paidCents;

    return {
      partnerId,
      clicks,
      orders,
      earnedCents,
      reversedCents,
      paidCents,
      commissionCents,
      balanceCents,
      coupons: partner.coupons,
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

  async deletePartner(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new NotFoundException('Partner not found.');
    }
    // Soft delete to preserve history (clicks, orders, commissions)
    await this.prisma.partner.update({
      where: { id },
      data: { active: false },
    });
    return { success: true };
  }

  async requestPartnerPayout(
    partnerId: string,
    userId: string,
    role: UserRole,
    dto: RequestPartnerPayoutDto,
    meta?: AuditMeta,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.findUnique({ where: { id: partnerId } });
      if (!partner) {
        throw new NotFoundException('Partner not found.');
      }
      await this.assertPartnerAccess(partner.ownerUserId, partner.ownerEmail, userId, role);

      const balanceCents = await this.getPartnerBalance(partnerId, tx);
      if (dto.amountCents > balanceCents) {
        throw new BadRequestException('Saldo insuficiente para este saque.');
      }

      return tx.partnerPayout.create({
        data: {
          partnerId,
          requestedByUserId: userId,
          amountCents: dto.amountCents,
          status: PartnerPayoutStatus.PENDING,
          pixKey: dto.pixKey.trim(),
          pixKeyType: dto.pixKeyType,
          requestIp: meta?.ip,
          requestUserAgent: meta?.userAgent,
        },
      });
    });
  }

  private async assertPartnerAccess(
    ownerUserId: string | null,
    ownerEmail: string | null | undefined,
    userId: string,
    role: UserRole,
  ) {
    if (role === UserRole.ADMIN) {
      return;
    }
    if (ownerUserId && ownerUserId === userId) {
      return;
    }
    if (ownerEmail) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (user?.email && user.email.toLowerCase() === ownerEmail.toLowerCase()) {
        return;
      }
    }
    throw new ForbiddenException('You do not have access to this partner.');
  }

  private async getPartnerBalance(partnerId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const [earned, reversed, paid] = await Promise.all([
      client.partnerCommissionEvent.aggregate({
        where: { partnerId, type: PartnerCommissionEventType.EARNED },
        _sum: { amountCents: true },
      }),
      client.partnerCommissionEvent.aggregate({
        where: { partnerId, type: PartnerCommissionEventType.REVERSED },
        _sum: { amountCents: true },
      }),
      client.partnerPayout.aggregate({
        where: { partnerId, status: PartnerPayoutStatus.PAID },
        _sum: { amountCents: true },
      }),
    ]);

    const earnedCents = earned._sum.amountCents ?? 0;
    const reversedCents = Math.abs(reversed._sum.amountCents ?? 0);
    const paidCents = paid._sum.amountCents ?? 0;
    return earnedCents - reversedCents - paidCents;
  }
}
