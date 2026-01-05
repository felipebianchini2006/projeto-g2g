import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import { AppModule } from './../src/app.module';
import { InventoryService } from './../src/modules/listings/inventory.service';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { RedisService } from './../src/modules/redis/redis.service';

describe('Inventory reservation concurrency (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let inventoryService: InventoryService;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['TOKEN_TTL'] = '900';
    process.env['REFRESH_TTL'] = '3600';
    process.env['DATABASE_URL'] =
      process.env['DATABASE_URL'] ?? 'postgresql://postgres:123456@localhost:5432/projeto_g2g';
    process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

    const redisMock = { ping: jest.fn().mockResolvedValue('PONG') };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    inventoryService = moduleFixture.get(InventoryService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('reserves only one item under concurrent requests', async () => {
    const seller = await prisma.user.create({
      data: {
        email: `seller-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'SELLER',
      },
    });
    const buyer = await prisma.user.create({
      data: {
        email: `buyer-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'USER',
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
        priceCents: 1000,
        currency: 'BRL',
        status: 'PUBLISHED',
        deliveryType: 'AUTO',
        deliverySlaHours: 24,
        refundPolicy: 'Refund in up to 7 days.',
      },
    });

    await prisma.inventoryItem.create({
      data: {
        listingId: listing.id,
        code: 'TEST-CODE-001',
        status: 'AVAILABLE',
      },
    });

    const orderA = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'PAID',
        totalAmountCents: listing.priceCents,
        currency: listing.currency,
      },
    });
    const orderItemA = await prisma.orderItemSnapshot.create({
      data: {
        orderId: orderA.id,
        listingId: listing.id,
        sellerId: seller.id,
        title: listing.title,
        unitPriceCents: listing.priceCents,
        quantity: 1,
        deliveryType: listing.deliveryType,
        currency: listing.currency,
      },
    });

    const orderB = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'PAID',
        totalAmountCents: listing.priceCents,
        currency: listing.currency,
      },
    });
    const orderItemB = await prisma.orderItemSnapshot.create({
      data: {
        orderId: orderB.id,
        listingId: listing.id,
        sellerId: seller.id,
        title: listing.title,
        unitPriceCents: listing.priceCents,
        quantity: 1,
        deliveryType: listing.deliveryType,
        currency: listing.currency,
      },
    });

    const firstReservation = inventoryService.reserveInventoryItem(listing.id, orderItemA.id, {
      holdMs: 200,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const secondReservation = inventoryService.reserveInventoryItem(listing.id, orderItemB.id);

    const results = await Promise.allSettled([firstReservation, secondReservation]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reserved = await prisma.inventoryItem.findMany({
      where: { listingId: listing.id, status: 'RESERVED' },
    });

    expect(reserved).toHaveLength(1);
    expect([orderItemA.id, orderItemB.id]).toContain(reserved[0].orderItemId);

    await prisma.orderItemSnapshot.deleteMany({
      where: { orderId: { in: [orderA.id, orderB.id] } },
    });
    await prisma.order.deleteMany({ where: { id: { in: [orderA.id, orderB.id] } } });
    await prisma.inventoryItem.deleteMany({ where: { listingId: listing.id } });
    await prisma.listing.deleteMany({ where: { id: listing.id } });
    await prisma.category.deleteMany({ where: { id: category.id } });
    await prisma.user.deleteMany({ where: { id: { in: [seller.id, buyer.id] } } });
  });
});
