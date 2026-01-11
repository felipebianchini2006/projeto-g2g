/* eslint-disable @typescript-eslint/unbound-method */
import { Test } from '@nestjs/testing';
import {
  LedgerEntrySource,
  LedgerEntryState,
  LedgerEntryType,
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailQueueService } from '../email/email.service';
import { SettingsService } from '../settings/settings.service';
import { RequestContextService } from '../request-context/request-context.service';
import { AppLogger } from '../logger/logger.service';
import { SettlementService } from './settlement.service';
import { getQueueToken } from '@nestjs/bullmq';
import { SETTLEMENT_QUEUE } from './settlement.queue';

describe('SettlementService', () => {
  let service: SettlementService;
  let prisma: PrismaService;
  let paymentsService: PaymentsService;

  beforeEach(async () => {
    const prismaMock = {
      $transaction: jest.fn(async (callback: (client: PrismaService) => Promise<unknown>) =>
        callback(prismaMock as unknown as PrismaService),
      ),
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ledgerEntry: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      payment: {
        update: jest.fn(),
      },
      orderEvent: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      emailOutbox: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
      webhookEvent: {
        findFirst: jest.fn(),
      },
    } as unknown as PrismaService;

    const paymentsMock = {
      cashOutPix: jest.fn(),
      refundPix: jest.fn(),
    } as unknown as PaymentsService;

    const settingsMock = {
      getSettings: jest.fn().mockResolvedValue({
        platformFeeBps: 1000,
        settlementReleaseDelayHours: 0,
        splitEnabled: false,
      }),
    } as unknown as SettingsService;

    const queueMock = {
      add: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SettlementService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PaymentsService, useValue: paymentsMock },
        { provide: EmailQueueService, useValue: { enqueueEmail: jest.fn() } },
        { provide: SettingsService, useValue: settingsMock },
        { provide: RequestContextService, useValue: { get: jest.fn() } },
        { provide: AppLogger, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() } },
        { provide: getQueueToken(SETTLEMENT_QUEUE), useValue: queueMock },
      ],
    }).compile();

    service = moduleRef.get(SettlementService);
    prisma = moduleRef.get(PrismaService);
    paymentsService = moduleRef.get(PaymentsService);
  });

  it('releases held balance, applies fee, and registers ledger entries', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.COMPLETED,
      sellerId: 'seller-1',
      buyerId: 'buyer-1',
      seller: { payoutPixKey: 'pix-key', payoutBlockedAt: null, email: 'seller@test.com' },
      payments: [
        {
          id: 'payment-1',
          amountCents: 10000,
          currency: 'BRL',
          status: PaymentStatus.CONFIRMED,
        },
      ],
      dispute: null,
      attribution: null,
    });
    (prisma.emailOutbox.create as jest.Mock).mockResolvedValue({ id: 'outbox-1' });

    (prisma.ledgerEntry.findFirst as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    (prisma.ledgerEntry.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'entry-held',
        userId: 'seller-1',
        orderId: 'order-1',
        paymentId: 'payment-1',
        type: LedgerEntryType.CREDIT,
        state: LedgerEntryState.HELD,
        source: LedgerEntrySource.ORDER_PAYMENT,
        amountCents: 10000,
        currency: 'BRL',
      },
    ]);

    await service.releaseOrder('order-1', 'admin-1', 'ok');

    expect(paymentsService.cashOutPix).toHaveBeenCalledWith({
      orderId: 'order-1',
      payoutPixKey: 'pix-key',
      amountCents: 9000,
      currency: 'BRL',
    });

    const ledgerCalls = (prisma.ledgerEntry.create as jest.Mock).mock.calls.map(
      (call) => call[0].data.amountCents,
    );
    expect(ledgerCalls).toEqual(expect.arrayContaining([10000, 10000, 1000, 9000]));
    expect(prisma.orderEvent.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('refunds order and records reversal entries while held', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-2',
      status: OrderStatus.IN_DELIVERY,
      sellerId: 'seller-2',
      buyerId: 'buyer-2',
      buyer: { email: 'buyer@test.com' },
      payments: [
        {
          id: 'payment-2',
          amountCents: 8000,
          currency: 'BRL',
          status: PaymentStatus.CONFIRMED,
          txid: 'tx-2',
        },
      ],
      dispute: null,
      attribution: null,
    });

    (prisma.ledgerEntry.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.webhookEvent.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.order.update as jest.Mock).mockResolvedValue({ id: 'order-2', status: 'REFUNDED' });

    await service.refundOrder('order-2', 'admin-1', 'customer request');

    expect(paymentsService.refundPix).toHaveBeenCalledWith({
      paymentId: 'payment-2',
      txid: 'tx-2',
      e2eId: undefined,
      amountCents: 8000,
      currency: 'BRL',
      reason: 'customer request',
    });

    const ledgerStates = (prisma.ledgerEntry.create as jest.Mock).mock.calls.map(
      (call) => ({
        state: call[0].data.state,
        type: call[0].data.type,
        amountCents: call[0].data.amountCents,
      }),
    );
    expect(ledgerStates).toEqual(
      expect.arrayContaining([
        { state: LedgerEntryState.HELD, type: LedgerEntryType.DEBIT, amountCents: 8000 },
        { state: LedgerEntryState.REVERSED, type: LedgerEntryType.CREDIT, amountCents: 8000 },
      ]),
    );
    expect(prisma.payment.update).toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalled();
  });
});
