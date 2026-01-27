/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

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

describe('OrdersService (dispute)', () => {
  it('blocks dispute when order status is not eligible', async () => {
    const prismaMock = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-1',
          buyerId: 'buyer-1',
          status: OrderStatus.CREATED,
          dispute: null,
        }),
      },
      $transaction: jest.fn(async (callback: (client: PrismaService) => Promise<unknown>) =>
        callback(prismaMock as unknown as PrismaService),
      ),
    } as unknown as PrismaService;

    const settlementMock = {
      cancelRelease: jest.fn(),
    } as unknown as SettlementService;

    const service = new OrdersService(
      prismaMock,
      { reserveInventoryItem: jest.fn() } as unknown as InventoryService,
      { scheduleOrderExpiration: jest.fn(), scheduleAutoComplete: jest.fn() } as unknown as OrdersQueueService,
      { get: jest.fn() } as unknown as ConfigService,
      settlementMock,
      { error: jest.fn() } as unknown as AppLogger,
      { enqueueEmail: jest.fn() } as unknown as EmailQueueService,
      { getSettings: jest.fn() } as unknown as SettingsService,
      { getValidCoupon: jest.fn(), consumeCouponUsage: jest.fn() } as unknown as CouponsService,
      { findActiveBySlug: jest.fn() } as unknown as PartnersService,
      { sendSms: jest.fn() } as any,
    );

    await expect(
      service.openDispute('order-1', 'buyer-1', { reason: 'Issue' }, { ip: '127.0.0.1' }),
    ).rejects.toThrow(BadRequestException);
  });
});
