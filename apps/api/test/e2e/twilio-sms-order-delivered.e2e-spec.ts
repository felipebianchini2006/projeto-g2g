import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { createTestApp } from '../utils/create-test-app';
import { resetDatabase } from '../utils/reset-db';

const { applyTestEnv } = require('../test-env.cjs');

const shouldRun = process.env.E2E_TWILIO_REAL === 'true';
const describeMaybe = shouldRun ? describe : describe.skip;

describeMaybe('Twilio SMS order delivered (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    applyTestEnv();

    const requiredEnv = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'E2E_TWILIO_TO',
    ];
    for (const key of requiredEnv) {
      if (!process.env[key]) {
        throw new Error(`Missing env: ${key}`);
      }
    }
    if (!process.env.TWILIO_MESSAGING_SERVICE_SID && !process.env.TWILIO_SMS_FROM) {
      throw new Error(
        'Missing env: TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM',
      );
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createTestApp(moduleFixture);
    prisma = moduleFixture.get(PrismaService);
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('marks order delivered and triggers SMS send', async () => {
    const passwordHash = await bcrypt.hash('12345678', 10);

    const seller = await prisma.user.create({
      data: {
        email: 'seller@twilio.test',
        passwordHash,
        role: 'SELLER',
      },
    });

    const buyer = await prisma.user.create({
      data: {
        email: 'buyer@twilio.test',
        passwordHash,
        role: 'USER',
        phoneE164: process.env.E2E_TWILIO_TO as string,
        phoneVerifiedAt: new Date(),
      },
    });

    const category = await prisma.category.create({
      data: {
        name: 'Categoria Entrega',
        slug: 'categoria-entrega',
        description: 'Categoria de entrega manual',
      },
    });

    const listing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        categoryId: category.id,
        title: 'Produto manual',
        description: 'Entrega manual',
        priceCents: 9900,
        currency: 'BRL',
        status: 'PUBLISHED',
        deliveryType: 'MANUAL',
        deliverySlaHours: 24,
        refundPolicy: 'Sem reembolso automatico.',
      },
    });

    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'IN_DELIVERY',
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
              currency: listing.currency,
            },
          ],
        },
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: seller.email, password: '12345678' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/orders/${order.id}/mark-delivered`)
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({})
      .expect(201);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe('DELIVERED');
  });
});
