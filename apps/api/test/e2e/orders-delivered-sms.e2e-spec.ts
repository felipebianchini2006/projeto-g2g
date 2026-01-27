import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '../../src/modules/prisma/prisma.service';
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

describe('Orders delivered SMS (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let twilioMessaging: FakeTwilioMessaging;
  let emailSender: FakeEmailSender;
  let emailQueue: FakeEmailQueueService;
  let twilioVerify: FakeTwilioVerify;

  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
    twilioMessaging = boot.twilioMessaging;
    emailSender = boot.emailSender;
    emailQueue = boot.emailQueue;
    twilioVerify = boot.twilioVerify;

    await prismaCleanup(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prismaCleanup(prisma);
    twilioMessaging.reset();
    emailSender.reset();
    emailQueue.reset();
    twilioVerify.reset();
  });

  const setupOrder = async () => {
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
        phoneE164: '+5511999999999',
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

    return { order, seller, buyer };
  };

  it('sends SMS notification when order is marked delivered', async () => {
    const { order, seller, buyer } = await setupOrder();
    const sellerToken = await getAuthToken(app, seller.email, '12345678');

    await request(app.getHttpServer())
      .post(`/orders/${order.id}/mark-delivered`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({})
      .expect(201);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('DELIVERED');

    expect(twilioMessaging.calls.length).toBe(1);
    expect(twilioMessaging.calls[0]?.to).toBe(buyer.phoneE164);
    expect(twilioMessaging.calls[0]?.body).toContain('Seu produto chegou');
    expect(twilioMessaging.calls[0]?.body).toContain(order.id);
  });

  it('does not fail when SMS send throws an error', async () => {
    const { order, seller } = await setupOrder();
    const sellerToken = await getAuthToken(app, seller.email, '12345678');
    twilioMessaging.shouldFail = true;

    await request(app.getHttpServer())
      .post(`/orders/${order.id}/mark-delivered`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({})
      .expect(201);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder?.status).toBe('DELIVERED');
  });
});
