jest.mock('@nestjs/bullmq', () => ({
  Processor: () => (target: unknown) => target,
  Process: () => () => undefined,
}));

import { Job } from 'bullmq';
import { NotificationType, PaymentStatus } from '@prisma/client';

import { AppLogger } from '../logger/logger.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookMetricsService } from './webhooks.metrics';
import { WebhooksProcessor } from './webhooks.processor';

describe('WebhooksProcessor', () => {
  let processor: WebhooksProcessor;
  let prismaService: PrismaService;
  let ordersService: OrdersService;
  let metricsService: WebhookMetricsService;

  beforeEach(() => {
    const prismaMock = {
      $transaction: jest.fn(),
      webhookEvent: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      emailOutbox: {
        create: jest.fn(),
      },
    } as unknown as PrismaService;

    const ordersMock = {
      applyPaymentConfirmation: jest.fn(),
      handlePaymentSideEffects: jest.fn(),
    } as unknown as OrdersService;

    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as AppLogger;

    const metricsMock = {
      increment: jest.fn(),
    } as unknown as WebhookMetricsService;

    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (callback: (client: PrismaService) => Promise<unknown>) => callback(prismaMock),
    );

    processor = new WebhooksProcessor(
      prismaMock,
      ordersMock,
      loggerMock,
      metricsMock,
    );

    prismaService = prismaMock;
    ordersService = ordersMock;
    metricsService = metricsMock;
  });

  it('processes paid webhook and updates payment', async () => {
    (prismaService.webhookEvent.findUnique as jest.Mock).mockResolvedValue({
      id: 'event-1',
      eventType: 'pix',
      txid: 'tx-1',
      processedAt: null,
      payload: { pix: [{ txid: 'tx-1' }] },
    });
    (prismaService.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
    });
    (ordersService.applyPaymentConfirmation as jest.Mock).mockResolvedValue({
      order: { id: 'order-1', items: [] },
      applied: true,
    });
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      buyer: { email: 'buyer@email.com' },
      seller: { email: 'seller@email.com' },
    });

    await processor.handleProcess({ data: { webhookEventId: 'event-1' } } as Job);

    expect(prismaService.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: expect.objectContaining({ status: PaymentStatus.CONFIRMED }),
    });
    expect(prismaService.webhookEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: expect.objectContaining({ processedAt: expect.any(Date), paymentId: 'payment-1' }),
    });
    expect(prismaService.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'buyer-1',
        type: NotificationType.PAYMENT,
      }),
    });
    expect(prismaService.emailOutbox.create).toHaveBeenCalled();
    expect(metricsService.increment).toHaveBeenCalledWith('processed', 'tx-1');
    expect(ordersService.handlePaymentSideEffects).toHaveBeenCalled();
  });

  it('skips already processed webhook', async () => {
    (prismaService.webhookEvent.findUnique as jest.Mock).mockResolvedValue({
      id: 'event-1',
      processedAt: new Date(),
      payload: {},
      eventType: 'pix',
    });

    await processor.handleProcess({ data: { webhookEventId: 'event-1' } } as Job);

    expect(metricsService.increment).toHaveBeenCalledWith('duplicated', 'event-1');
    expect(prismaService.payment.update).not.toHaveBeenCalled();
    expect(ordersService.applyPaymentConfirmation).not.toHaveBeenCalled();
  });
});
