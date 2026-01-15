import { Injectable } from '@nestjs/common';
import { LedgerEntrySource, LedgerEntryState, LedgerEntryType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { OrdersQueueService } from '../orders/orders.queue.service';
import { WalletEntriesQueryDto } from './dto/wallet-entries-query.dto';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { buildWalletSummary, type WalletSummaryRow } from './wallet.utils';
import { OrderStatus } from '@prisma/client';

const DEFAULT_TAKE = 20;

type WalletEntryItem = {
  id: string;
  type: LedgerEntryType;
  state: LedgerEntryState;
  source: LedgerEntrySource;
  amountCents: number;
  currency: string;
  description: string | null;
  orderId: string | null;
  paymentId: string | null;
  createdAt: Date;
};

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersQueue: OrdersQueueService,
  ) { }

  async getSummary(userId: string) {
    const rows = await this.prisma.ledgerEntry.groupBy({
      by: ['state', 'type', 'currency'],
      where: { userId },
      _sum: { amountCents: true },
    });

    return buildWalletSummary(rows as WalletSummaryRow[]);
  }

  async createTopupPix(userId: string, dto: TopupWalletDto) {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        sellerId: null, // Top-up has no seller
        totalAmountCents: dto.amountCents,
        currency: 'BRL',
        status: OrderStatus.CREATED,
        expiresAt,
        items: {
          create: [], // Top-up has no items
        },
      },
    });

    await this.ordersQueue.scheduleOrderExpiration(order.id, expiresAt);

    const payment = await this.paymentsService.createPixCharge(order, userId);

    return {
      orderId: order.id,
      payment,
    };
  }

  async listEntries(userId: string, query: WalletEntriesQueryDto) {
    const where: Prisma.LedgerEntryWhereInput = { userId };

    if (query.source) {
      where.source = query.source;
    }

    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? DEFAULT_TAKE;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          type: true,
          state: true,
          source: true,
          amountCents: true,
          currency: true,
          description: true,
          orderId: true,
          paymentId: true,
          createdAt: true,
        },
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return {
      items: items as WalletEntryItem[],
      total,
      skip,
      take,
    };
  }
}
