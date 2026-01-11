import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { PaymentStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { EmailQueueService } from './../src/modules/email/email.service';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { WebhooksProcessor } from './../src/modules/webhooks/webhooks.processor';
import { WEBHOOKS_QUEUE } from './../src/modules/webhooks/webhooks.queue';
import { resetDatabase } from './utils/reset-db';
import { createTestApp } from './utils/create-test-app';

const { applyTestEnv } = require('./test-env.cjs');

jest.setTimeout(20000);

describe('Checkout Pix (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let processor: WebhooksProcessor;

  const queueMock = {
    opts: {
      connection: {
        url:
          process.env['E2E_REDIS_URL'] ??
          process.env['REDIS_URL'] ??
          'redis://localhost:6380',
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
    applyTestEnv();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken(WEBHOOKS_QUEUE))
      .useValue(queueMock)
      .overrideProvider(EmailQueueService)
      .useValue({ enqueueEmail: jest.fn() })
      .compile();

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);
    processor = moduleFixture.get(WebhooksProcessor);

    app = await createTestApp(moduleFixture);

    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates order and confirms Pix payment via webhook', async () => {
    const buyer = await prisma.user.create({
      data: {
        email: `buyer-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'USER',
      },
    });
    const seller = await prisma.user.create({
      data: {
        email: `seller-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'SELLER',
      },
    });

    const category = await prisma.category.create({
      data: {
        name: `Category ${randomUUID()}`,
        slug: `category-${randomUUID()}`,
        description: 'Test category',
      },
    });

    const listing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: category.id,
        title: 'Auto Listing',
        description: 'Auto listing description',
        priceCents: 1200,
        currency: 'BRL',
        status: 'PUBLISHED',
        deliveryType: 'AUTO',
        deliverySlaHours: 24,
        refundPolicy: 'Refund in up to 7 days.',
      },
    });

    await prisma.inventoryItem.createMany({
      data: [
        { listingId: listing.id, code: 'AUTO-001', status: 'AVAILABLE' },
        { listingId: listing.id, code: 'AUTO-002', status: 'AVAILABLE' },
      ],
    });

    const buyerToken = await jwtService.signAsync({ sub: buyer.id, role: buyer.role });

    await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId: listing.id,
        quantity: 0,
      })
      .expect(400);

    const checkoutResponse = await request(app.getHttpServer())
      .post('/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        listingId: listing.id,
        quantity: 1,
      })
      .expect(201);

    const { order, payment } = checkoutResponse.body;

    expect(order.status).toBe('AWAITING_PAYMENT');
    expect(payment.status).toBe(PaymentStatus.PENDING);
    expect(payment.txid).toBeDefined();

    await request(app.getHttpServer())
      .post('/webhooks/efi/pix')
      .send({
        txid: payment.txid,
        pix: [{ txid: payment.txid, horario: new Date().toISOString() }],
      })
      .expect(201);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    const updatedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    const orderEvents = await prisma.orderEvent.findMany({ where: { orderId: order.id } });

    expect(updatedPayment?.status).toBe(PaymentStatus.CONFIRMED);
    expect(updatedOrder?.status).not.toBe('AWAITING_PAYMENT');
    expect(orderEvents.some((event) => event.type === 'PAID')).toBe(true);
  });
});
