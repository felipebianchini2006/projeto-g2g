import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UserBlockDto } from './dto/user-block.dto';
import { UsersQueryDto } from './dto/users-query.dto';

type AuditMeta = {
  ip?: string;
  userAgent?: string;
};

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  blockedAt: true,
  blockedReason: true,
  payoutBlockedAt: true,
  payoutBlockedReason: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: UsersQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (typeof query.blocked === 'boolean') {
      where.blockedAt = query.blocked ? { not: null } : null;
    }

    if (query.search) {
      where.email = { contains: query.search, mode: 'insensitive' };
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      skip,
      take,
    };
  }

  async blockUser(userId: string, adminId: string, dto: UserBlockDto, meta: AuditMeta) {
    if (!dto.reason) {
      throw new BadRequestException('Block reason is required.');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found.');
      }

      const blockedAt = user.blockedAt ?? now;
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          blockedAt,
          blockedReason: dto.reason,
        },
        select: USER_SELECT,
      });

      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.auditLog.create({
        data: {
          adminId,
          action: AuditAction.PERMISSION_CHANGE,
          entityType: 'user',
          entityId: userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          payload: {
            action: 'block',
            reason: dto.reason,
            previous: {
              blockedAt: user.blockedAt,
              blockedReason: user.blockedReason,
              role: user.role,
            },
          },
        },
      });

      return updated;
    });
  }

  async unblockUser(userId: string, adminId: string, meta: AuditMeta) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found.');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          blockedAt: null,
          blockedReason: null,
        },
        select: USER_SELECT,
      });

      await tx.auditLog.create({
        data: {
          adminId,
          action: AuditAction.PERMISSION_CHANGE,
          entityType: 'user',
          entityId: userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          payload: {
            action: 'unblock',
            previous: {
              blockedAt: user.blockedAt,
              blockedReason: user.blockedReason,
              role: user.role,
            },
          },
        },
      });

      return updated;
    });
  }
}
