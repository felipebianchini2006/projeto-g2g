import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LedgerEntrySource, LedgerEntryState, LedgerEntryType, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { resetDatabase } from './utils/reset-db';
import { createTestApp } from './utils/create-test-app';

const { applyTestEnv } = require('./test-env.cjs');

describe('Ledger release (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    applyTestEnv();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await createTestApp(moduleFixture);

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('releases held balance and creates ledger entries', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `admin-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'ADMIN',
      },
    });
    const seller = await prisma.user.create({
      data: {
        email: `seller-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'SELLER',
        payoutPixKey: 'pix-key-seller',
      },
    });
    const buyer = await prisma.user.create({
      data: {
        email: `buyer-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: 'USER',
      },
    });

    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'COMPLETED',
        totalAmountCents: 5000,
        currency: 'BRL',
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        payerId: buyer.id,
        provider: 'EFI',
        txid: `tx-${randomUUID().replace(/-/g, '').slice(0, 20)}`,
        status: PaymentStatus.CONFIRMED,
        amountCents: 5000,
        currency: 'BRL',
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        userId: seller.id,
        orderId: order.id,
        paymentId: payment.id,
        type: LedgerEntryType.CREDIT,
        state: LedgerEntryState.HELD,
        source: LedgerEntrySource.ORDER_PAYMENT,
        amountCents: 5000,
        currency: 'BRL',
        description: 'Held funds',
      },
    });

    const adminToken = await jwtService.signAsync({ sub: admin.id, role: admin.role });

    const releaseResponse = await request(app.getHttpServer())
      .post(`/admin/orders/${order.id}/release`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'release test' })
      .expect(201);

    expect(releaseResponse.body.status).toBe('released');

    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { orderId: order.id },
    });

    const hasAvailable = ledgerEntries.some(
      (entry) =>
        entry.state === LedgerEntryState.AVAILABLE &&
        entry.type === LedgerEntryType.CREDIT &&
        entry.source === LedgerEntrySource.ORDER_PAYMENT,
    );
    const hasPayout = ledgerEntries.some((entry) => entry.source === LedgerEntrySource.PAYOUT);

    expect(hasAvailable).toBe(true);
    expect(hasPayout).toBe(true);
  });
});
