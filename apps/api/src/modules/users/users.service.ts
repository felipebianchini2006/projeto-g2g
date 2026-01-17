import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UserBlockDto } from './dto/user-block.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserUpdateDto } from './dto/user-update.dto';
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

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  cpf: true,
  birthDate: true,
  addressZip: true,
  addressStreet: true,
  addressNumber: true,
  addressComplement: true,
  addressDistrict: true,
  addressCity: true,
  addressState: true,
  addressCountry: true,
  avatarUrl: true,
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

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    const normalizeText = (value?: string) => {
      if (typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const normalizeDigits = (value?: string) => {
      if (typeof value !== 'string') {
        return null;
      }
      const digits = value.replace(/\D/g, '');
      return digits.length ? digits : null;
    };

    const data: Prisma.UserUpdateInput = {};
    if (dto.fullName !== undefined) {
      data.fullName = normalizeText(dto.fullName);
    }
    if (dto.cpf !== undefined) {
      const normalizedCpf = normalizeDigits(dto.cpf);
      if (normalizedCpf) {
        const existingCpfUser = await this.prisma.user.findFirst({
          where: {
            cpf: normalizedCpf,
            NOT: { id: userId },
          },
          select: { id: true, blockedAt: true },
        });
        if (existingCpfUser) {
          if (existingCpfUser.blockedAt) {
            throw new BadRequestException('CPF vinculado a uma conta bloqueada.');
          }
          throw new BadRequestException('CPF ja cadastrado.');
        }
      }
      data.cpf = normalizedCpf;
    }
    if (dto.birthDate !== undefined) {
      data.birthDate = normalizeText(dto.birthDate);
    }
    if (dto.addressZip !== undefined) {
      data.addressZip = normalizeDigits(dto.addressZip);
    }
    if (dto.addressStreet !== undefined) {
      data.addressStreet = normalizeText(dto.addressStreet);
    }
    if (dto.addressNumber !== undefined) {
      data.addressNumber = normalizeText(dto.addressNumber);
    }
    if (dto.addressComplement !== undefined) {
      data.addressComplement = normalizeText(dto.addressComplement);
    }
    if (dto.addressDistrict !== undefined) {
      data.addressDistrict = normalizeText(dto.addressDistrict);
    }
    if (dto.addressCity !== undefined) {
      data.addressCity = normalizeText(dto.addressCity);
    }
    if (dto.addressState !== undefined) {
      data.addressState = normalizeText(dto.addressState);
    }
    if (dto.addressCountry !== undefined) {
      data.addressCountry = normalizeText(dto.addressCountry);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update.');
    }

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
        select: USER_PROFILE_SELECT,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found.');
        }
        if (error.code === 'P2002') {
          const target = Array.isArray(error.meta?.target) ? error.meta?.target : [];
          if (target.includes('cpf')) {
            throw new BadRequestException('CPF ja cadastrado.');
          }
        }
      }
      throw error;
    }
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: USER_PROFILE_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found.');
      }
      throw error;
    }
  }

  async getFollowStatus(userId: string, targetId: string) {
    if (userId === targetId) {
      return { following: false };
    }
    const follow = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      select: { id: true },
    });
    return { following: Boolean(follow) };
  }

  async toggleFollow(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new BadRequestException('Cannot follow yourself.');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found.');
    }
    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.userFollow.delete({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      });
      return { following: false };
    }
    await this.prisma.userFollow.create({
      data: { followerId: userId, followingId: targetId },
    });
    return { following: true };
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

  async updateUser(userId: string, adminId: string, dto: UserUpdateDto, meta: AuditMeta) {
    if (!dto.email && !dto.role) {
      throw new BadRequestException('No fields to update.');
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: USER_SELECT,
      });

      if (!current) {
        throw new NotFoundException('User not found.');
      }

      const data: Prisma.UserUpdateInput = {};
      if (dto.email && dto.email !== current.email) {
        data.email = dto.email;
      }
      if (dto.role && dto.role !== current.role) {
        data.role = dto.role;
      }

      if (Object.keys(data).length === 0) {
        return current;
      }

      let updated: typeof current;
      try {
        updated = await tx.user.update({
          where: { id: userId },
          data,
          select: USER_SELECT,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException('Email ja cadastrado.');
        }
        throw error;
      }

      await tx.auditLog.create({
        data: {
          adminId,
          action: AuditAction.PERMISSION_CHANGE,
          entityType: 'user',
          entityId: userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          payload: {
            action: 'update',
            previous: {
              email: current.email,
              role: current.role,
            },
            next: {
              email: updated.email,
              role: updated.role,
            },
          },
        },
      });

      return updated;
    });
  }
}
