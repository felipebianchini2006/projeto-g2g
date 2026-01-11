import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { resetDatabase } from './utils/reset-db';
import { createTestApp } from './utils/create-test-app';

const { applyTestEnv } = require('./test-env.cjs');

describe('Listings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let sellerToken: string;

  beforeAll(async () => {
    applyTestEnv();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createTestApp(moduleFixture);

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    await resetDatabase(prisma);

    const seller = await prisma.user.create({
      data: {
        email: `seller-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'SELLER',
      },
    });

    sellerToken = await jwtService.signAsync({ sub: seller.id, role: seller.role });
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, lists, and retrieves seller listings', async () => {
    const category = await prisma.category.create({
      data: {
        name: `Category ${randomUUID()}`,
        slug: `category-${randomUUID()}`,
        description: 'Test category',
      },
    });

    const createResponse = await request(app.getHttpServer())
      .post('/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        categoryId: category.id,
        title: 'Listing Test',
        description: 'Listing description',
        priceCents: 2500,
        currency: 'BRL',
        deliveryType: 'AUTO',
        deliverySlaHours: 24,
        refundPolicy: 'Refund within 7 days.',
      })
      .expect(201);

    const listingId = createResponse.body.id;
    expect(createResponse.body.title).toBe('Listing Test');

    const listResponse = await request(app.getHttpServer())
      .get('/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(listResponse.body.some((listing: { id: string }) => listing.id === listingId)).toBe(
      true,
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`/listings/${listingId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(detailResponse.body.id).toBe(listingId);
    expect(detailResponse.body.priceCents).toBe(2500);
  });
});
