import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { OrderStatus, UserRole } from '@prisma/client';

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

    const [salesCount, reviewsAggregate, onlineSession] = await Promise.all([
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
    ]);

    return {
      id: user.id,
      role: user.role,
      displayName,
      handle,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
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
    };
  }
}
