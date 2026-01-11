/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { DeliveryType, ListingStatus, OrderStatus } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import type { InventoryService } from '../listings/inventory.service';
import type { OrdersQueueService } from './orders.queue.service';
import type { SettlementService } from '../settlement/settlement.service';
import type { AppLogger } from '../logger/logger.service';
import type { EmailQueueService } from '../email/email.service';
import type { SettingsService } from '../settings/settings.service';
import type { CouponsService } from '../coupons/coupons.service';
import type { PartnersService } from '../partners/partners.service';
import type { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';

describe('OrdersService (checkout)', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let ordersQueue: { scheduleOrderExpiration: jest.Mock };

  beforeEach(() => {
    const prismaMock = {
      listing: {
        findUnique: jest.fn(),
      },
      inventoryItem: {
        count: jest.fn(),
      },
      order: {
        create: jest.fn(),
        update: jest.fn(),
      },
      orderEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (client: PrismaService) => Promise<unknown>) =>
        callback(prismaMock as unknown as PrismaService),
      ),
    } as unknown as PrismaService;

    ordersQueue = {
      scheduleOrderExpiration: jest.fn(),
    };

    const configMock = {
      get: jest.fn(),
    } as unknown as ConfigService;

    service = new OrdersService(
      prismaMock,
      { reserveInventoryItem: jest.fn() } as unknown as InventoryService,
      ordersQueue as unknown as OrdersQueueService,
      configMock,
      { scheduleRelease: jest.fn(), cancelRelease: jest.fn() } as unknown as SettlementService,
      { error: jest.fn() } as unknown as AppLogger,
      { enqueueEmail: jest.fn() } as unknown as EmailQueueService,
      {
        getSettings: jest.fn().mockResolvedValue({ orderPaymentTtlSeconds: 900, platformFeeBps: 0 }),
      } as unknown as SettingsService,
      {
        getValidCoupon: jest.fn(),
        consumeCouponUsage: jest.fn(),
      } as unknown as CouponsService,
      { findActiveBySlug: jest.fn() } as unknown as PartnersService,
    );

    prisma = prismaMock;
  });

  it('creates order with correct totals and quantities', async () => {
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
      id: 'listing-1',
      sellerId: 'seller-1',
      status: ListingStatus.PUBLISHED,
      priceCents: 2000,
      currency: 'BRL',
      deliveryType: DeliveryType.AUTO,
      title: 'Auto listing',
    });
    (prisma.inventoryItem.count as jest.Mock).mockResolvedValue(10);
    (prisma.order.create as jest.Mock).mockResolvedValue({
      id: 'order-1',
      items: [{ id: 'item-1', listingId: 'listing-1', deliveryType: DeliveryType.AUTO }],
      attribution: null,
    });
    (prisma.order.update as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.AWAITING_PAYMENT,
    });

    const result = await service.createOrder(
      'buyer-1',
      { listingId: 'listing-1', quantity: 3 },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(result.status).toBe(OrderStatus.AWAITING_PAYMENT);

    const createCall = (prisma.order.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.totalAmountCents).toBe(6000);
    expect(Number.isInteger(createCall.data.totalAmountCents)).toBe(true);
    expect(createCall.data.items.create[0].quantity).toBe(3);
    expect(Number.isInteger(createCall.data.items.create[0].unitPriceCents)).toBe(true);
    expect(ordersQueue.scheduleOrderExpiration).toHaveBeenCalledWith(
      'order-1',
      expect.any(Date),
    );
  });

  it('rejects checkout when listing does not exist', async () => {
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createOrder('buyer-1', { listingId: 'listing-1', quantity: 1 }, { ip: '::1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects checkout when inventory is insufficient', async () => {
    (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
      id: 'listing-1',
      sellerId: 'seller-1',
      status: ListingStatus.PUBLISHED,
      priceCents: 2000,
      currency: 'BRL',
      deliveryType: DeliveryType.AUTO,
      title: 'Auto listing',
    });
    (prisma.inventoryItem.count as jest.Mock).mockResolvedValue(0);

    await expect(
      service.createOrder('buyer-1', { listingId: 'listing-1', quantity: 2 }, { ip: '::1' }),
    ).rejects.toThrow(BadRequestException);
  });
});