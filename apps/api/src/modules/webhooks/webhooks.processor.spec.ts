/* eslint-disable @typescript-eslint/unbound-method */
import type { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import type { Job } from 'bullmq';

import { EmailQueueService } from '../email/email.service';
import type { AppLogger } from '../logger/logger.service';
import { OrdersService } from '../orders/orders.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from '../request-context/request-context.service';
import type { SettlementService } from '../settlement/settlement.service';
import { WebhookMetricsService } from './webhooks.metrics';
import { WebhooksProcessor } from './webhooks.processor';

describe('WebhooksProcessor (Wallet Top-up)', () => {
  let processor: WebhooksProcessor;
  let prismaService: PrismaService;
  let ordersService: OrdersService;

  beforeEach(() => {
    const prismaMock = {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
        callback(prismaMock),
      ),
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
        update: jest.fn(),
      },
      ledgerEntry: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      emailOutbox: {
        create: jest.fn(),
      },
    };

    ordersService = {
      applyPaymentConfirmation: jest.fn(),
      handlePaymentSideEffects: jest.fn(),
    } as unknown as OrdersService;

    // Fix: Explicitly cast prismaMock and define mock implementation properly
    const mockTransaction = jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback(prismaMock),
    );

    Object.assign(prismaMock, {
      $transaction: mockTransaction
    });

    processor = new WebhooksProcessor(
      prismaMock as unknown as PrismaService,
      ordersService,
      { createHeldEntry: jest.fn() } as unknown as SettlementService,
      { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as AppLogger,
      { increment: jest.fn() } as unknown as WebhookMetricsService,
      { enqueueEmail: jest.fn() } as unknown as EmailQueueService,
      {
        run: jest.fn(
          async (_ctx: unknown, callback: () => Promise<unknown>): Promise<unknown> => await callback(),
        ),
        set: jest.fn(),
      } as unknown as RequestContextService,
    );

    prismaService = prismaMock as unknown as PrismaService;
  });

  it('credits wallet and completes top-up order on webhook', async () => {
    const webhookEvent = {
      id: 'event-1',
      eventType: 'PIX',
      payload: {
        pix: [{ txid: 'txid-123', horario: new Date().toISOString() }],
      },
    };

    (prismaService.webhookEvent.findUnique as jest.Mock).mockResolvedValue(webhookEvent);
    (prismaService.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-topup',
      status: PaymentStatus.PENDING,
      amountCents: 5000,
      currency: 'BRL',
      txid: 'txid-123',
    });

    (ordersService.applyPaymentConfirmation as jest.Mock).mockResolvedValue({
      order: { id: 'order-topup' },
      applied: true,
    });

    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-topup',
      buyerId: 'user-1',
      sellerId: null, // Top-up
      buyer: { email: 'user@test.com' },
    });

    // Mock no existing entry to allow creation
    (prismaService.ledgerEntry.findFirst as jest.Mock).mockResolvedValue(null);

    const job = {
      name: 'ProcessEfi',
      data: { webhookEventId: 'event-1' },
      id: 'job-1',
    } as unknown as Job;

    await processor.process(job);

    // Verify Ledger Entry Creation
    expect(prismaService.ledgerEntry.create).toHaveBeenCalledTimes(1);
    expect(prismaService.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'CREDIT',
          state: 'AVAILABLE',
          source: 'WALLET_TOPUP',
          amountCents: 5000,
          paymentId: 'payment-1',
        }),
      }),
    );

    // Verify Order Completion
    expect(prismaService.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-topup' },
        data: expect.objectContaining({
          status: 'COMPLETED',
        }),
      }),
    );
  });

  it('is idempotent and does not credit twice', async () => {
    const webhookEvent = {
      id: 'event-1',
      eventType: 'PIX',
      payload: {
        pix: [{ txid: 'txid-123', horario: new Date().toISOString() }],
      },
    };

    (prismaService.webhookEvent.findUnique as jest.Mock).mockResolvedValue(webhookEvent);
    (prismaService.payment.findUnique as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      orderId: 'order-topup',
      status: PaymentStatus.CONFIRMED, // Already confirmed
      amountCents: 5000,
      currency: 'BRL',
      txid: 'txid-123',
    });

    (ordersService.applyPaymentConfirmation as jest.Mock).mockResolvedValue({
      order: { id: 'order-topup' },
      applied: false, // Not applied again
    });

    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-topup',
      buyerId: 'user-1',
      sellerId: null,
      buyer: { email: 'user@test.com' },
    });

    // Mock existing entry
    (prismaService.ledgerEntry.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-entry' });

    const job = {
      name: 'ProcessEfi',
      data: { webhookEventId: 'event-1' },
      id: 'job-1',
    } as unknown as Job;

    await processor.process(job);

    // Should NOT create new ledger entry
    expect(prismaService.ledgerEntry.create).not.toHaveBeenCalled();
  });
});
