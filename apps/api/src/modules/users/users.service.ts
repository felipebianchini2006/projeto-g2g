import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, OrderStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';

import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersQueueService } from '../orders/orders.queue.service';
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
  adminPermissions: true,
  blockedAt: true,
  blockedUntil: true,
  blockedReason: true,
  payoutBlockedAt: true,
  payoutBlockedReason: true,
  createdAt: true,
  updatedAt: true,
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
  phoneE164: true,
  phoneVerifiedAt: true,
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
  bio: true,
  gameTags: true,
  phoneE164: true,
  phoneVerifiedAt: true,
  verificationFeeOrderId: true,
  verificationFeePaidAt: true,
};

const USER_ROLE_SELECT = {
  id: true,
  role: true,
};

const VERIFICATION_FEE_AMOUNT_CENTS = 3;
const VERIFICATION_FEE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersQueue: OrdersQueueService,
  ) { }

  async listUsers(query: UsersQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (typeof query.blocked === 'boolean') {
      const now = new Date();
      if (query.blocked) {
        where.AND = [
          { blockedAt: { not: null } },
          { OR: [{ blockedUntil: null }, { blockedUntil: { gt: now } }] },
        ];
      } else {
        where.OR = [{ blockedAt: null }, { blockedUntil: { lte: now } }];
      }
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
      throw new NotFoundException('Usuário não encontrado.');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationFeePaidAt: true },
    });
    const hasProtectedChanges = [
      'fullName',
      'cpf',
      'birthDate',
      'phone',
      'addressZip',
      'addressStreet',
      'addressNumber',
      'addressComplement',
      'addressDistrict',
      'addressCity',
      'addressState',
      'addressCountry',
    ].some((field) => dto[field as keyof UpdateUserProfileDto] !== undefined);
    if (current?.verificationFeePaidAt && hasProtectedChanges) {
      throw new BadRequestException('Dados ja verificados e bloqueados para edicao.');
    }

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

    const normalizeTags = (tags?: string[]) => {
      if (!Array.isArray(tags)) {
        return [];
      }
      const seen = new Set<string>();
      const normalized: string[] = [];
      for (const tag of tags) {
        if (typeof tag !== 'string') {
          continue;
        }
        const cleaned = tag.trim();
        if (!cleaned) {
          continue;
        }
        const key = cleaned.toLowerCase();
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        normalized.push(cleaned);
      }
      return normalized;
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
    if (dto.phone !== undefined) {
      data.phoneE164 = normalizeDigits(dto.phone);
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
    if (dto.bio !== undefined) {
      data.bio = normalizeText(dto.bio);
    }
    if (dto.gameTags !== undefined) {
      data.gameTags = normalizeTags(dto.gameTags);
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
          throw new NotFoundException('Usuário não encontrado.');
        }
        if (error.code === 'P2002') {
          const target = Array.isArray(error.meta?.['target'])
            ? (error.meta?.['target'] as string[])
            : [];
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
        throw new NotFoundException('Usuário não encontrado.');
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
      throw new NotFoundException('Usuário não encontrado.');
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
        throw new NotFoundException('Usuário não encontrado.');
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
        throw new NotFoundException('Usuário não encontrado.');
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
    if (!dto.email && !dto.role && !dto.adminPermissions) {
      throw new BadRequestException('No fields to update.');
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: USER_SELECT,
      });

      if (!current) {
        throw new NotFoundException('Usuário não encontrado.');
      }

      const data: Prisma.UserUpdateInput = {};
      if (dto.email && dto.email !== current.email) {
        data.email = dto.email;
      }

      const normalizePermissions = (permissions?: string[]) => {
        if (!Array.isArray(permissions)) {
          return [];
        }
        const unique = new Set<string>();
        const result: string[] = [];
        for (const permission of permissions) {
          if (typeof permission !== 'string') {
            continue;
          }
          const cleaned = permission.trim();
          if (!cleaned || unique.has(cleaned)) {
            continue;
          }
          unique.add(cleaned);
          result.push(cleaned);
        }
        return result;
      };

      const currentPermissions = current.adminPermissions ?? [];
      const targetRole = dto.role ?? current.role;
      let nextPermissions = currentPermissions;

      if (targetRole === UserRole.AJUDANTE) {
        if (dto.adminPermissions !== undefined) {
          nextPermissions = normalizePermissions(dto.adminPermissions);
        } else if (current.role !== UserRole.AJUDANTE) {
          nextPermissions = [];
        }
      } else {
        nextPermissions = [];
      }

      const roleChanged = dto.role !== undefined && dto.role !== current.role;
      if (roleChanged) {
        data.role = dto.role;
      }

      const permissionsChanged =
        nextPermissions.length !== currentPermissions.length ||
        nextPermissions.some((permission, index) => permission !== currentPermissions[index]);
      if (permissionsChanged) {
        data.adminPermissions = nextPermissions;
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

      if (roleChanged || permissionsChanged) {
        await tx.auditLog.create({
          data: {
            adminId,
            action: AuditAction.PERMISSION_CHANGE,
            entityType: 'User',
            entityId: userId,
            ip: meta.ip,
            userAgent: meta.userAgent,
            payload: {
              fromRole: current.role,
              toRole: updated.role,
              permissions: updated.adminPermissions ?? [],
            },
          },
        });
      }

      return updated;
    });
  }

  async upgradeToSeller(userId: string, meta: AuditMeta) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: userId },
        select: USER_ROLE_SELECT,
      });

      if (!current) {
        throw new NotFoundException('Usuário não encontrado.');
      }

      if (current.role !== 'USER') {
        return current;
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { role: 'SELLER' },
        select: USER_ROLE_SELECT,
      });

      await tx.auditLog.create({
        data: {
          adminId: userId,
          action: AuditAction.PERMISSION_CHANGE,
          entityType: 'user',
          entityId: userId,
          ip: meta.ip,
          userAgent: meta.userAgent,
          payload: {
            action: 'self_upgrade',
            previous: {
              role: current.role,
            },
            next: {
              role: updated.role,
            },
          },
        },
      });

      return updated;
    });
  }

  async getVerificationFeeStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationFeePaidAt: true, verificationFeeOrderId: true, fullName: true, cpf: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.verificationFeePaidAt) {
      return { status: 'PAID', paidAt: user.verificationFeePaidAt };
    }

    if (!user.fullName?.trim() || !user.cpf) {
      throw new BadRequestException('Preencha nome completo e CPF antes de gerar o Pix.');
    }

    if (!user.verificationFeeOrderId) {
      return { status: 'NOT_PAID' };
    }

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: user.verificationFeeOrderId },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return { status: 'NOT_PAID' };
    }

    if (payment.status === PaymentStatus.CONFIRMED) {
      const paidAt = payment.paidAt ?? new Date();
      await this.prisma.user.update({
        where: { id: userId },
        data: { verificationFeePaidAt: paidAt, verificationFeeOrderId: null },
      });
      return { status: 'PAID', paidAt };
    }

    if (payment.status === PaymentStatus.PENDING) {
      return {
        status: 'PENDING',
        payment: {
          id: payment.id,
          orderId: payment.orderId,
          provider: payment.provider,
          txid: payment.txid,
          status: payment.status,
          amountCents: payment.amountCents,
          currency: payment.currency,
          qrCode: payment.qrCode,
          copyPaste: payment.copyPaste,
          expiresAt: payment.expiresAt,
        },
      };
    }

    return { status: 'NOT_PAID' };
  }

  async createVerificationFeePix(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationFeePaidAt: true, verificationFeeOrderId: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (user.verificationFeePaidAt) {
      return { status: 'PAID', paidAt: user.verificationFeePaidAt };
    }

    if (user.verificationFeeOrderId) {
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          orderId: user.verificationFeeOrderId,
          status: PaymentStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existingPayment) {
        return {
          status: 'PENDING',
          payment: {
            id: existingPayment.id,
            orderId: existingPayment.orderId,
            provider: existingPayment.provider,
            txid: existingPayment.txid,
            status: existingPayment.status,
            amountCents: existingPayment.amountCents,
            currency: existingPayment.currency,
            qrCode: existingPayment.qrCode,
            copyPaste: existingPayment.copyPaste,
            expiresAt: existingPayment.expiresAt,
          },
        };
      }
    }

    const expiresAt = new Date(Date.now() + VERIFICATION_FEE_TTL_MS);
    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        sellerId: null,
        totalAmountCents: VERIFICATION_FEE_AMOUNT_CENTS,
        currency: 'BRL',
        status: OrderStatus.CREATED,
        expiresAt,
        items: {
          create: [],
        },
      },
    });

    await this.ordersQueue.scheduleOrderExpiration(order.id, expiresAt);

    const payment = await this.paymentsService.createPixCharge(order, userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationFeeOrderId: order.id },
    });

    return {
      status: 'PENDING',
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        provider: payment.provider,
        txid: payment.txid,
        status: payment.status,
        amountCents: payment.amountCents,
        currency: payment.currency,
        qrCode: payment.qrCode,
        copyPaste: payment.copyPaste,
        expiresAt: payment.expiresAt,
      },
    };
  }
}
