import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerEntrySource,
  LedgerEntryState,
  LedgerEntryType,
  PayoutScope,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AdminBalanceAdjustDto } from './dto/admin-balance-adjust.dto';
import { AdminPayoutBlockDto } from './dto/admin-payout-block.dto';
import { AdminSecurityPayoutsQueryDto } from './dto/admin-security-payouts-query.dto';
import { AdminUserBlockDto } from './dto/admin-user-block.dto';

@Injectable()
export class SecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async listPayoutRequests(query: AdminSecurityPayoutsQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [payouts, total] = await this.prisma.$transaction([
      this.prisma.payout.findMany({
        where: { scope: PayoutScope.USER },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              cpf: true,
              payoutBlockedAt: true,
              payoutBlockedReason: true,
              blockedAt: true,
              blockedUntil: true,
              blockedReason: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.payout.count({ where: { scope: PayoutScope.USER } }),
    ]);

    const userIds = payouts
      .map((payout) => payout.userId)
      .filter((userId): userId is string => Boolean(userId));

    const payoutCounts = userIds.length
      ? await this.prisma.payout.groupBy({
          by: ['userId'],
          where: { scope: PayoutScope.USER, userId: { in: userIds } },
          _count: { _all: true },
        })
      : [];

    const countMap = new Map(
      payoutCounts.map((item) => [item.userId, item._count._all]),
    );

    const items = payouts.map((payout) => {
      const count = payout.userId ? countMap.get(payout.userId) ?? 0 : 0;
      return {
        ...payout,
        payoutCount: count,
        cpfUsedBefore: count > 1,
      };
    });

    return { items, total, skip, take };
  }

  async adjustBalance(userId: string, dto: AdminBalanceAdjustDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const amount = Math.abs(dto.amountCents);
    if (amount <= 0) {
      throw new BadRequestException('Amount must be non-zero.');
    }

    return this.prisma.ledgerEntry.create({
      data: {
        userId,
        type: dto.amountCents >= 0 ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT,
        state: LedgerEntryState.AVAILABLE,
        source: LedgerEntrySource.MANUAL_ADJUSTMENT,
        amountCents: amount,
        description: dto.reason.trim(),
      },
    });
  }

  async blockPayouts(userId: string, dto: AdminPayoutBlockDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        payoutBlockedAt: new Date(),
        payoutBlockedReason: dto.reason.trim(),
      },
    });
  }

  async unblockPayouts(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { payoutBlockedAt: null, payoutBlockedReason: null },
    });
  }

  async blockUser(userId: string, dto: AdminUserBlockDto) {
    const now = new Date();
    const blockedUntil = new Date(now.getTime() + dto.durationDays * 24 * 60 * 60 * 1000);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedAt: now,
        blockedUntil,
        blockedReason: dto.reason.trim(),
      },
    });
  }

  async unblockUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { blockedAt: null, blockedUntil: null, blockedReason: null },
    });
  }
}
