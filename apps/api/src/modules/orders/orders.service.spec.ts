/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  DeliveryEvidenceType,
  DeliveryType,
  OrderEventType,
  OrderStatus,
  UserRole,
} from '@prisma/client';

import type { EmailQueueService } from '../email/email.service';
import type { InventoryService } from '../listings/inventory.service';
import type { AppLogger } from '../logger/logger.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettlementService } from '../settlement/settlement.service';
import type { SettingsService } from '../settings/settings.service';
import type { CouponsService } from '../coupons/coupons.service';
import type { PartnersService } from '../partners/partners.service';
import type { CreateDeliveryEvidenceDto } from './dto/create-delivery-evidence.dto';
import { DeliveryEvidenceInputType } from './dto/create-delivery-evidence.dto';
import type { MarkDeliveredDto } from './dto/mark-delivered.dto';
import type { OrdersQueueService } from './orders.queue.service';
import { OrdersService } from './orders.service';

describe('OrdersService (manual delivery)', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let ordersQueue: { scheduleAutoComplete: jest.Mock };
  let twilioMessaging: { sendSms: jest.Mock };
  let emailQueue: { enqueueEmail: jest.Mock };

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
    twilioMessaging = {
      sendSms: jest.fn(),
    };
    emailQueue = {
      enqueueEmail: jest.fn(),
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
      emailQueue as unknown as EmailQueueService,
      { getSettings: jest.fn() } as unknown as SettingsService,
      {
        getValidCoupon: jest.fn(),
        consumeCouponUsage: jest.fn(),
      } as unknown as CouponsService,
      { findActiveBySlug: jest.fn() } as unknown as PartnersService,
      twilioMessaging as any,
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

    const deliveryEvidenceCreate = prismaService.deliveryEvidence.create as jest.Mock;
    const evidenceCall = deliveryEvidenceCreate.mock.calls[0] as [
      {
        data: {
          orderItemId: string;
          type: DeliveryEvidenceType;
          content: string;
          createdByUserId: string;
        };
      },
    ];
    expect(evidenceCall[0].data).toEqual({
      orderItemId: 'item-1',
      type: DeliveryEvidenceType.TEXT,
      content: 'Proof of delivery',
      createdByUserId: 'seller-1',
    });
    const orderEventCreate = prismaService.orderEvent.create as jest.Mock;
    const eventCall = orderEventCreate.mock.calls[0] as [{ data: { type: OrderEventType } }];
    expect(eventCall[0].data.type).toBe(OrderEventType.NOTE);
    expect(result.evidence).toHaveLength(1);
  });

  it('rejects evidence when order is not in delivery', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.DELIVERED,
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
      service.addDeliveryEvidence('order-1', 'seller-1', UserRole.SELLER, dto, {}),
    ).rejects.toThrow(BadRequestException);
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
      buyer: {
        email: 'buyer@test.com',
        phoneE164: '+5511999999999',
        phoneVerifiedAt: new Date(),
      },
      seller: { email: 'seller@test.com' },
    });
    (twilioMessaging.sendSms as jest.Mock).mockResolvedValue({ sid: 'msg-1' });
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

    const orderUpdate = prismaService.order.update as jest.Mock;
    const updateCall = orderUpdate.mock.calls[0] as [
      { data: { status: OrderStatus; deliveredAt: Date } },
    ];
    expect(updateCall[0].data.status).toBe(OrderStatus.DELIVERED);
    expect(updateCall[0].data.deliveredAt).toBeInstanceOf(Date);
    const orderEventCreate = prismaService.orderEvent.create as jest.Mock;
    const eventCall = orderEventCreate.mock.calls[0] as [{ data: { type: OrderEventType } }];
    expect(eventCall[0].data.type).toBe(OrderEventType.DELIVERED);
    expect(ordersQueue.scheduleAutoComplete).toHaveBeenCalledWith('order-1', 24 * 60 * 60 * 1000);
    expect(twilioMessaging.sendSms).toHaveBeenCalledWith(
      '+5511999999999',
      'Seu produto chegou! Pedido order-1. Obrigado pela compra.',
    );
    expect(result.status).toBe(OrderStatus.DELIVERED);
  });

  it('rejects marking delivered when not in delivery', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.PAID,
      items: [
        {
          id: 'item-1',
          deliveryType: DeliveryType.MANUAL,
          sellerId: 'seller-1',
        },
      ],
    });

    await expect(
      service.markOrderDelivered(
        'order-1',
        'seller-1',
        UserRole.SELLER,
        { note: 'Delivered manually' },
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks receipt confirmation before delivered', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      buyerId: 'buyer-1',
      status: OrderStatus.IN_DELIVERY,
    });

    await expect(service.confirmReceipt('order-1', 'buyer-1', { note: 'ok' }, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates receipt email when payment side effects run', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.IN_DELIVERY,
      totalAmountCents: 8000,
      buyer: { email: 'buyer@test.com' },
      items: [
        {
          title: 'Produto A',
          quantity: 1,
          unitPriceCents: 8000,
          currency: 'BRL',
        },
      ],
    });
    (prismaService.emailOutbox.create as jest.Mock).mockResolvedValue({ id: 'outbox-2' });

    await service.handlePaymentSideEffects(
      {
        id: 'order-1',
        items: [{ id: 'item-1', listingId: 'listing-1', deliveryType: DeliveryType.MANUAL }],
      },
      'buyer-1',
      {},
    );

    expect(prismaService.emailOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: 'buyer@test.com',
          subject: 'Comprovante de compra - Pedido order-1',
        }),
      }),
    );
    expect(emailQueue.enqueueEmail).toHaveBeenCalledWith('outbox-2');
  });
});
