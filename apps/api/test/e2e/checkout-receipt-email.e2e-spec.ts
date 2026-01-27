import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import bcrypt from 'bcryptjs';
import type { Job } from 'bullmq';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { WebhooksProcessor } from '../../src/modules/webhooks/webhooks.processor';
import { WEBHOOKS_QUEUE } from '../../src/modules/webhooks/webhooks.queue';
import {
  bootstrapTestApp,
  FakeEmailQueueService,
  FakeEmailSender,
  FakeTwilioMessaging,
  FakeTwilioVerify,
  getAuthToken,
  prismaCleanup,
} from './helpers/bootstrap';

jest.setTimeout(60000);

describe('Checkout receipt email (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let emailQueue: FakeEmailQueueService;
  let emailSender: FakeEmailSender;
  let twilioMessaging: FakeTwilioMessaging;
  let twilioVerify: FakeTwilioVerify;
  let processor: WebhooksProcessor;

  const queueMock = {
    opts: {
      connection: {
        url: process.env.E2E_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6380',
      },
    },
    add: jest.fn(async (_name: string, data: { webhookEventId: string; correlationId?: string }) => {
      await processor.handleProcess({
        id: `job-${data.webhookEventId}`,
        data,
      } as Job);
    }),
  };

  beforeAll(async () => {
    const boot = await bootstrapTestApp({
      overrides: (builder) =>
        builder.overrideProvider(getQueueToken(WEBHOOKS_QUEUE)).useValue(queueMock),
    });

    app = boot.app;
    prisma = boot.prisma;
    emailQueue = boot.emailQueue;
    emailSender = boot.emailSender;
    twilioMessaging = boot.twilioMessaging;
    twilioVerify = boot.twilioVerify;
    processor = app.get(WebhooksProcessor);

    await prismaCleanup(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prismaCleanup(prisma);
    emailQueue.reset();
    emailSender.reset();
    twilioMessaging.reset();
    twilioVerify.reset();
    queueMock.add.mockClear();
  });

  it('creates receipt email after payment confirmation', async () => {
    const passwordHash = await bcrypt.hash('12345678', 10);

    const seller = await prisma.user.create({
      data: {
        email: 'seller@email.com',
        passwordHash,
        role: 'SELLER',
      },
    });

    const buyer = await prisma.user.create({
      data: {
        email: 'buyer@email.com',
        passwordHash,
        role: 'USER',
      },
    });

    const category = await prisma.category.create({
      data: {
        name: 'Categoria Teste',
        slug: 'categoria-teste',
        description: 'Categoria para testes',
      },
    });

    const listing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: category.id,
        title: 'Produto manual',
        description: 'Descricao manual',
        priceCents: 15900,
        currency: 'BRL',
        status: 'PUBLISHED',
        deliveryType: 'MANUAL',
        deliverySlaHours: 24,
        refundPolicy: 'Sem reembolso automatico.',
      },
    });

    const buyerToken = await getAuthToken(app, buyer.email, '12345678');

    const checkoutResponse = await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing.id, quantity: 1 })
      .expect(201);

    const { order, payment } = checkoutResponse.body;

    await request(app.getHttpServer())
      .post('/webhooks/efi/pix')
      .send({
        txid: payment.txid,
        pix: [{ txid: payment.txid, horario: new Date().toISOString() }],
      })
      .expect(201);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('IN_DELIVERY');

    const receiptOutbox = await prisma.emailOutbox.findFirst({
      where: {
        to: buyer.email,
        subject: { contains: 'Comprovante de compra' },
      },
    });

    expect(receiptOutbox).toBeTruthy();
    expect(receiptOutbox?.subject).toContain(order.id);
    expect(receiptOutbox?.body).toContain('Total:');
    expect(receiptOutbox?.body).toContain('Itens:');
    expect(receiptOutbox?.body).toContain('Status:');
    expect(emailQueue.enqueued).toContain(receiptOutbox?.id as string);
  });
});
