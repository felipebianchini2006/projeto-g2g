import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { RedisService } from './../src/modules/redis/redis.service';
import { SettlementService } from './../src/modules/settlement/settlement.service';

describe('Tickets & Disputes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let buyerToken: string;
  let sellerToken: string;
  let outsiderToken: string;
  let adminId: string;
  let buyerId: string;
  let sellerId: string;
  let outsiderId: string;
  let orderId: string;
  let orderRefundId: string;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['TOKEN_TTL'] = '900';
    process.env['REFRESH_TTL'] = '3600';
    process.env['DATABASE_URL'] =
      process.env['DATABASE_URL'] ?? 'postgresql://postgres:123456@localhost:5432/projeto_g2g';
    process.env['REDIS_URL'] = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

    const redisMock = { ping: jest.fn().mockResolvedValue('PONG') };
    const settlementMock = {
      scheduleRelease: jest.fn(),
      cancelRelease: jest.fn(),
      releaseOrder: jest.fn(async (id: string) => {
        await prisma.order.update({
          where: { id },
          data: { status: 'COMPLETED' },
        });
        return { status: 'released', orderId: id };
      }),
      refundOrder: jest.fn(async (id: string) => {
        await prisma.order.update({
          where: { id },
          data: { status: 'REFUNDED' },
        });
        return { status: 'refunded', orderId: id };
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .overrideProvider(SettlementService)
      .useValue(settlementMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    const admin = await prisma.user.create({
      data: {
        email: `admin-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: UserRole.ADMIN,
      },
    });
    const buyer = await prisma.user.create({
      data: {
        email: `buyer-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: UserRole.USER,
      },
    });
    const seller = await prisma.user.create({
      data: {
        email: `seller-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: UserRole.SELLER,
      },
    });
    const outsider = await prisma.user.create({
      data: {
        email: `outsider-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: UserRole.USER,
      },
    });

    adminId = admin.id;
    buyerId = buyer.id;
    sellerId = seller.id;
    outsiderId = outsider.id;

    adminToken = await jwtService.signAsync({ sub: admin.id, role: admin.role });
    buyerToken = await jwtService.signAsync({ sub: buyer.id, role: buyer.role });
    sellerToken = await jwtService.signAsync({ sub: seller.id, role: seller.role });
    outsiderToken = await jwtService.signAsync({ sub: outsider.id, role: outsider.role });

    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'DELIVERED',
        totalAmountCents: 1000,
        currency: 'BRL',
      },
    });
    orderId = order.id;

    const orderRefund = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'DELIVERED',
        totalAmountCents: 1500,
        currency: 'BRL',
      },
    });
    orderRefundId = orderRefund.id;
  });

  afterAll(async () => {
    await prisma.ticketMessage.deleteMany({
      where: { ticket: { orderId: { in: [orderId, orderRefundId] } } },
    });
    await prisma.ticket.deleteMany({ where: { orderId: { in: [orderId, orderRefundId] } } });
    await prisma.dispute.deleteMany({ where: { orderId: { in: [orderId, orderRefundId] } } });
    await prisma.order.deleteMany({ where: { id: { in: [orderId, orderRefundId] } } });
    await prisma.auditLog.deleteMany({ where: { adminId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, buyerId, sellerId, outsiderId] } } });
    await app.close();
  });

  it('allows buyer/seller to access tickets and blocks outsiders', async () => {
    const ticketResponse = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        orderId,
        subject: 'Problema no pedido',
        message: 'Preciso de ajuda com o pedido.',
      })
      .expect(201);

    const ticketId = ticketResponse.body.id;

    const buyerList = await request(app.getHttpServer())
      .get('/tickets')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(buyerList.body.some((ticket: { id: string }) => ticket.id === ticketId)).toBe(true);

    await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);

    const messageResponse = await request(app.getHttpServer())
      .post(`/tickets/${ticketId}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ message: 'Vamos ajudar por aqui.' })
      .expect(201);

    expect(messageResponse.body.ticketId).toBe(ticketId);
  });

  it('opens dispute and resolves release', async () => {
    const disputeResponse = await request(app.getHttpServer())
      .post(`/orders/${orderId}/dispute`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'Produto nao recebido.' })
      .expect(201);

    expect(disputeResponse.body.status).toBe('DISPUTED');

    const dispute = await prisma.dispute.findUnique({ where: { orderId } });
    expect(dispute).not.toBeNull();

    await request(app.getHttpServer())
      .post(`/admin/disputes/${dispute?.id}/resolve`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ action: 'release', reason: 'Tentativa nao autorizada.' })
      .expect(403);

    const resolveResponse = await request(app.getHttpServer())
      .post(`/admin/disputes/${dispute?.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'release', reason: 'Entrega confirmada.' })
      .expect(201);

    expect(resolveResponse.body.status).toBe('released');

    const updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    expect(updatedOrder?.status).toBe('COMPLETED');

    const updatedDispute = await prisma.dispute.findUnique({ where: { orderId } });
    expect(updatedDispute?.status).toBe('REJECTED');
  });

  it('opens dispute and resolves refund', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${orderRefundId}/dispute`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ reason: 'Produto com defeito.' })
      .expect(201);

    const dispute = await prisma.dispute.findUnique({ where: { orderId: orderRefundId } });
    expect(dispute).not.toBeNull();

    const resolveResponse = await request(app.getHttpServer())
      .post(`/admin/disputes/${dispute?.id}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'refund', reason: 'Reembolso aprovado.' })
      .expect(201);

    expect(resolveResponse.body.status).toBe('refunded');

    const updatedOrder = await prisma.order.findUnique({ where: { id: orderRefundId } });
    expect(updatedOrder?.status).toBe('REFUNDED');

    const updatedDispute = await prisma.dispute.findUnique({ where: { orderId: orderRefundId } });
    expect(updatedDispute?.status).toBe('RESOLVED');
  });
});
