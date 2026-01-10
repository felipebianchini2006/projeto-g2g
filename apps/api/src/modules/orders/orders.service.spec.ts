import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeliveryEvidenceType,
  DeliveryType,
  OrderEventType,
  OrderStatus,
  UserRole,
} from '@prisma/client';

import { EmailQueueService } from '../email/email.service';
import { InventoryService } from '../listings/inventory.service';
import { AppLogger } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementService } from '../settlement/settlement.service';
import { SettingsService } from '../settings/settings.service';
import {
  CreateDeliveryEvidenceDto,
  DeliveryEvidenceInputType,
} from './dto/create-delivery-evidence.dto';
import { MarkDeliveredDto } from './dto/mark-delivered.dto';
import { OrdersQueueService } from './orders.queue.service';
import { OrdersService } from './orders.service';

describe('OrdersService (manual delivery)', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let ordersQueue: { scheduleAutoComplete: jest.Mock };

  beforeEach(() => {
    const prismaMock = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      deliveryEvidence: {
        create: jest.fn(),
      },
      orderEvent: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      emailOutbox: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (client: PrismaService) => Promise<unknown>) =>
        callback(prismaMock as unknown as PrismaService),
      ),
    } as unknown as PrismaService;

    ordersQueue = {
      scheduleAutoComplete: jest.fn(),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'ORDER_AUTO_COMPLETE_HOURS') {
          return 24;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new OrdersService(
      prismaMock,
      { reserveInventoryItem: jest.fn() } as unknown as InventoryService,
      ordersQueue as unknown as OrdersQueueService,
      configMock,
      { scheduleRelease: jest.fn(), cancelRelease: jest.fn() } as unknown as SettlementService,
      { error: jest.fn() } as unknown as AppLogger,
      { enqueueEmail: jest.fn() } as unknown as EmailQueueService,
      { getSettings: jest.fn() } as unknown as SettingsService,
    );

    prismaService = prismaMock;
  });

  it('blocks evidence when seller does not own manual item', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.IN_DELIVERY,
      items: [
        {
          id: 'item-1',
          deliveryType: DeliveryType.MANUAL,
          sellerId: 'seller-1',
        },
      ],
    });

    const dto: CreateDeliveryEvidenceDto = {
      type: DeliveryEvidenceInputType.TEXT,
      content: 'Proof of delivery',
    };

    await expect(
      service.addDeliveryEvidence('order-1', 'seller-2', UserRole.SELLER, dto, {}),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates delivery evidence for manual item', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.IN_DELIVERY,
      items: [
        {
          id: 'item-1',
          deliveryType: DeliveryType.MANUAL,
          sellerId: 'seller-1',
        },
      ],
    });
    (prismaService.deliveryEvidence.create as jest.Mock).mockResolvedValue({
      id: 'evidence-1',
      orderItemId: 'item-1',
      type: DeliveryEvidenceType.TEXT,
      content: 'Proof of delivery',
    });

    const dto: CreateDeliveryEvidenceDto = {
      type: DeliveryEvidenceInputType.TEXT,
      content: 'Proof of delivery',
    };

    const result = await service.addDeliveryEvidence(
      'order-1',
      'seller-1',
      UserRole.SELLER,
      dto,
      {},
    );

    expect(prismaService.deliveryEvidence.create).toHaveBeenCalledWith({
      data: {
        orderItemId: 'item-1',
        type: DeliveryEvidenceType.TEXT,
        content: 'Proof of delivery',
        createdByUserId: 'seller-1',
      },
    });
    expect(prismaService.orderEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: OrderEventType.NOTE }),
      }),
    );
    expect(result.evidence).toHaveLength(1);
  });

  it('marks manual order delivered and schedules auto-complete', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.IN_DELIVERY,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      items: [
        {
          id: 'item-1',
          deliveryType: DeliveryType.MANUAL,
          sellerId: 'seller-1',
        },
      ],
      buyer: { email: 'buyer@test.com' },
      seller: { email: 'seller@test.com' },
    });
    (prismaService.order.update as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.DELIVERED,
    });
    (prismaService.emailOutbox.create as jest.Mock).mockResolvedValue({ id: 'outbox-1' });

    const dto: MarkDeliveredDto = { note: 'Delivered manually' };

    const result = await service.markOrderDelivered(
      'order-1',
      'seller-1',
      UserRole.SELLER,
      dto,
      {},
    );

    expect(prismaService.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: OrderStatus.DELIVERED, deliveredAt: expect.any(Date) },
    });
    expect(prismaService.orderEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: OrderEventType.DELIVERED }),
      }),
    );
    expect(ordersQueue.scheduleAutoComplete).toHaveBeenCalledWith(
      'order-1',
      24 * 60 * 60 * 1000,
    );
    expect(result.status).toBe(OrderStatus.DELIVERED);
  });
});
