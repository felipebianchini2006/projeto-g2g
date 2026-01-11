import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PaymentStatus, UserRole } from '@prisma/client';
import type { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { EmailQueueService } from './../src/modules/email/email.service';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { WebhooksProcessor } from './../src/modules/webhooks/webhooks.processor';
import { WEBHOOKS_QUEUE } from './../src/modules/webhooks/webhooks.queue';

jest.setTimeout(20000);

describe('Webhooks idempotency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let processor: WebhooksProcessor;
  const queueMock = {
    opts: {
      connection: {
        url:
          process.env['E2E_REDIS_URL'] ??
          process.env['REDIS_URL'] ??
          'redis://localhost:6379',
      },
    },
    add: jest.fn(
      async (_name: string, data: { webhookEventId: string; correlationId?: string }) => {
        await processor.handleProcess({
          id: `job-${data.webhookEventId}`,
          data,
        } as Job);
      },
    ),
  };

  let buyerId: string | undefined;
  let sellerId: string | undefined;
  let categoryId: string | undefined;
  let listingId: string | undefined;
  let orderId: string | undefined;
  let paymentId: string | undefined;
  let paymentTxid: string | undefined;
  let buyerEmail: string | undefined;
  let sellerEmail: string | undefined;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['TOKEN_TTL'] = '900';
    process.env['REFRESH_TTL'] = '3600';
    process.env['DATABASE_URL'] =
      process.env['E2E_DATABASE_URL'] ??
      process.env['DATABASE_URL'] ??
      'postgresql://postgres:123456@localhost:5432/projeto_g2g';
    process.env['REDIS_URL'] =
      process.env['E2E_REDIS_URL'] ??
      process.env['REDIS_URL'] ??
      'redis://localhost:6379';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken(WEBHOOKS_QUEUE))
      .useValue(queueMock)
      .overrideProvider(EmailQueueService)
      .useValue({ enqueueEmail: jest.fn() })
      .compile();

    prisma = moduleFixture.get(PrismaService);
    processor = moduleFixture.get(WebhooksProcessor);

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (prisma) {
      if (orderId) {
        await prisma.notification.deleteMany({
          where: { userId: { in: [buyerId, sellerId].filter(Boolean) as string[] } },
        });
        if (buyerEmail || sellerEmail) {
          await prisma.emailOutbox.deleteMany({
            where: { to: { in: [buyerEmail, sellerEmail].filter(Boolean) as string[] } },
          });
        }
        await prisma.webhookEvent.deleteMany({ where: { txid: paymentTxid } });
        await prisma.ledgerEntry.deleteMany({ where: { orderId } });
        await prisma.payment.deleteMany({ where: { id: paymentId } });
        await prisma.orderEvent.deleteMany({ where: { orderId } });
        await prisma.orderItemSnapshot.deleteMany({ where: { orderId } });
        await prisma.order.deleteMany({ where: { id: orderId } });
      }
      if (listingId) {
        await prisma.listing.deleteMany({ where: { id: listingId } });
      }
      if (categoryId) {
        await prisma.category.deleteMany({ where: { id: categoryId } });
      }
      if (buyerId || sellerId) {
        await prisma.user.deleteMany({
          where: { id: { in: [buyerId, sellerId].filter(Boolean) as string[] } },
        });
      }
    }
    if (app) {
      await app.close();
    }
  });

  it('does not apply duplicated webhook twice', async () => {
    const suffix = randomUUID();
    buyerEmail = `buyer-${suffix}@test.com`;
    const buyer = await prisma.user.create({
      data: {
        email: buyerEmail,
        passwordHash: 'hash',
        role: UserRole.USER,
      },
    });
    sellerEmail = `seller-${suffix}@test.com`;
    const seller = await prisma.user.create({
      data: {
        email: sellerEmail,
        passwordHash: 'hash',
        role: UserRole.SELLER,
      },
    });

    buyerId = buyer.id;
    sellerId = seller.id;

    const category = await prisma.category.create({
      data: {
        name: `Category ${suffix}`,
        slug: `category-${suffix}`,
        description: 'Test category',
      },
    });
    categoryId = category.id;

    const listing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: category.id,
        title: `Manual listing ${suffix}`,
        slug: `manual-${suffix}`,
        description: 'Manual listing for webhook test',
        priceCents: 12300,
        currency: 'BRL',
        status: 'PUBLISHED',
        deliveryType: 'MANUAL',
        deliverySlaHours: 24,
        refundPolicy: 'Test policy',
      },
    });
    listingId = listing.id;

    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'AWAITING_PAYMENT',
        totalAmountCents: listing.priceCents,
        currency: 'BRL',
        items: {
          create: [
            {
              listingId: listing.id,
              sellerId: seller.id,
              title: listing.title,
              unitPriceCents: listing.priceCents,
              quantity: 1,
              deliveryType: listing.deliveryType,
              currency: 'BRL',
            },
          ],
        },
      },
    });
    orderId = order.id;

    paymentTxid = `tx-${suffix.replace(/-/g, '').slice(0, 20)}`;
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        payerId: buyer.id,
        provider: 'EFI',
        txid: paymentTxid,
        status: PaymentStatus.PENDING,
        amountCents: listing.priceCents,
        currency: 'BRL',
      },
    });
    paymentId = payment.id;

    const payload = {
      txid: payment.txid,
      pix: [{ txid: payment.txid, horario: new Date().toISOString() }],
    };

    await request(app.getHttpServer()).post('/webhooks/efi/pix').send(payload).expect(201);

    const orderAfter = await prisma.order.findUnique({ where: { id: order.id } });
    const paymentAfter = await prisma.payment.findUnique({ where: { id: payment.id } });
    const eventsCount = await prisma.orderEvent.count({ where: { orderId: order.id } });
    const ledgerCount = await prisma.ledgerEntry.count({
      where: {
        orderId: order.id,
        paymentId: payment.id,
        type: 'CREDIT',
        state: 'HELD',
        source: 'ORDER_PAYMENT',
      },
    });

    expect(orderAfter?.status).toBe('IN_DELIVERY');
    expect(paymentAfter?.status).toBe(PaymentStatus.CONFIRMED);
    expect(eventsCount).toBe(2);
    expect(ledgerCount).toBe(1);

    const duplicate = await request(app.getHttpServer())
      .post('/webhooks/efi/pix')
      .send(payload)
      .expect(201);

    expect(duplicate.body.duplicate).toBe(true);

    const eventsCountAfter = await prisma.orderEvent.count({ where: { orderId: order.id } });
    const ledgerCountAfter = await prisma.ledgerEntry.count({
      where: {
        orderId: order.id,
        paymentId: payment.id,
        type: 'CREDIT',
        state: 'HELD',
        source: 'ORDER_PAYMENT',
      },
    });

    expect(eventsCountAfter).toBe(eventsCount);
    expect(ledgerCountAfter).toBe(ledgerCount);
    expect(queueMock.add).toHaveBeenCalledTimes(1);
  });
});
