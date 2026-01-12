import { Controller, Get, Param, Query } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PublicReviewsQueryDto } from './dto/public-reviews-query.dto';

const getEmailPrefix = (email: string) => email.split('@')[0] || 'usuario';

@Controller('public/sellers')
export class PublicReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/reviews')
  async listReviews(@Param('id') sellerId: string, @Query() query: PublicReviewsQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 10;

    const [items, total, aggregate, distributionRaw] = await Promise.all([
      this.prisma.sellerReview.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          buyer: { select: { fullName: true, email: true, avatarUrl: true } },
          orderItem: { select: { title: true } },
        },
      }),
      this.prisma.sellerReview.count({ where: { sellerId } }),
      this.prisma.sellerReview.aggregate({
        where: { sellerId },
        _avg: { rating: true },
      }),
      this.prisma.sellerReview.groupBy({
        by: ['rating'],
        where: { sellerId },
        _count: { _all: true },
      }),
    ]);

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    distributionRaw.forEach((entry) => {
      distribution[entry.rating] = entry._count._all;
    });

    return {
      items: items.map((review) => {
        const prefix = getEmailPrefix(review.buyer.email);
        const buyerName = review.buyer.fullName?.trim() || `Usuario ${prefix}`;
        return {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          verifiedPurchase: review.verifiedPurchase,
          createdAt: review.createdAt,
          buyer: {
            displayName: buyerName,
            avatarUrl: review.buyer.avatarUrl,
          },
          productTitle: review.orderItem?.title ?? 'Produto',
        };
      }),
      total,
      ratingAverage: aggregate._avg.rating ?? 0,
      distribution,
    };
  }
}
