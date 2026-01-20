import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { DeliveryType, ListingStatus, OrderStatus, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

const normalizeHandle = (value: string) => {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized.length ? normalized : 'usuario';
};

const getEmailPrefix = (email: string) => email.split('@')[0] || 'usuario';

@Controller('public/users')
export class PublicUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async getProfile(@Param('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        cpf: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const emailPrefix = getEmailPrefix(user.email);
    const displayName = user.fullName?.trim() || emailPrefix || 'Usuario';
    const handle = normalizeHandle(emailPrefix);
    const isVerified = Boolean(user.fullName && user.cpf);

    const [
      salesCount,
      reviewsAggregate,
      onlineSession,
      lastSeenSession,
      deliveryPerformance,
      responseMinutes,
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          sellerId: user.id,
          status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
        },
      }),
      this.prisma.sellerReview.aggregate({
        where: { sellerId: user.id },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.session.findFirst({
        where: {
          userId: user.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      }),
      this.prisma.session.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
      this.resolveDeliveryPerformance(user.id),
      this.resolveResponseMinutes(user.id),
    ]);

    return {
      id: user.id,
      role: user.role,
      displayName,
      handle,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      lastSeenAt: lastSeenSession?.updatedAt ?? null,
      isOnline: Boolean(onlineSession),
      isVerified,
      isPremium: user.role === UserRole.ADMIN,
      stats: {
        ratingAverage: reviewsAggregate._avg.rating ?? 0,
        reviewsCount: reviewsAggregate._count._all,
        salesCount,
        viewsCount: null,
      },
      trustSeals: {
        cpfVerified: Boolean(user.cpf),
        emailVerified: Boolean(user.email),
        phoneVerified: false,
      },
      performance: {
        responseTimeMinutes: responseMinutes,
        onTimeDeliveryRate: deliveryPerformance,
      },
    };
  }

  private async resolveDeliveryPerformance(userId: string) {
    const listings = await this.prisma.listing.findMany({
      where: { sellerId: userId, status: ListingStatus.PUBLISHED },
      select: { deliveryType: true },
    });

    if (listings.length > 0 && listings.every((item) => item.deliveryType === DeliveryType.AUTO)) {
      return 100;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        sellerId: userId,
        status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.COMPLETED] },
      },
      select: {
        createdAt: true,
        deliveredAt: true,
        items: {
          select: {
            listing: { select: { deliverySlaHours: true } },
          },
        },
      },
    });

    let total = 0;
    let onTime = 0;
    for (const order of orders) {
      if (!order.deliveredAt) {
        continue;
      }
      for (const item of order.items) {
        const slaHours = item.listing?.deliverySlaHours;
        if (!slaHours) {
          continue;
        }
        total += 1;
        const deadline = order.createdAt.getTime() + slaHours * 60 * 60 * 1000;
        if (order.deliveredAt.getTime() <= deadline) {
          onTime += 1;
        }
      }
    }

    if (!total) {
      return null;
    }

    return Math.round((onTime / total) * 1000) / 10;
  }

  private async resolveResponseMinutes(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { order: { sellerId: userId } },
      select: {
        order: { select: { sellerId: true } },
        messages: { select: { senderId: true, createdAt: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    let totalMs = 0;
    let totalResponses = 0;

    for (const room of rooms) {
      const sellerId = room.order.sellerId;
      if (!sellerId) {
        continue;
      }
      let awaitingAt: Date | null = null;
      for (const message of room.messages) {
        if (message.senderId !== sellerId) {
          if (!awaitingAt) {
            awaitingAt = message.createdAt;
          }
          continue;
        }
        if (awaitingAt) {
          totalMs += message.createdAt.getTime() - awaitingAt.getTime();
          totalResponses += 1;
          awaitingAt = null;
        }
      }
    }

    if (!totalResponses) {
      return null;
    }

    return Math.max(1, Math.round(totalMs / totalResponses / 60000));
  }
}
