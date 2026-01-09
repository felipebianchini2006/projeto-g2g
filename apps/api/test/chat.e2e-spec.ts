import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { AddressInfo } from 'net';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { RedisService } from './../src/modules/redis/redis.service';

const connectSocket = (url: string, token: string) =>
  new Promise<Socket>((resolve, reject) => {
    const socket = io(url, {
      auth: { token },
      transports: ['websocket'],
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connection timed out.'));
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      socket.disconnect();
      reject(error);
    });
  });

describe('Chat gateway (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let baseUrl: string;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['TOKEN_TTL'] = '900';
    process.env['REFRESH_TTL'] = '3600';
    process.env['DATABASE_URL'] =
      process.env['E2E_DATABASE_URL'] ??
      'postgresql://postgres:123456@localhost:5433/projeto_g2g_test';
    process.env['REDIS_URL'] = process.env['E2E_REDIS_URL'] ?? 'redis://localhost:6380';

    const redisMock = { ping: jest.fn().mockResolvedValue('PONG') };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);

    prisma = moduleFixture.get(PrismaService);
    jwtService = moduleFixture.get(JwtService);

    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}/chat`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('connects with a valid token', async () => {
    const user = await prisma.user.create({
      data: {
        email: `chat-user-${randomUUID()}@test.com`,
        passwordHash: 'hash',
        role: UserRole.USER,
      },
    });

    const token = await jwtService.signAsync({ sub: user.id, role: user.role });
    const socket = await connectSocket(baseUrl, token);

    expect(socket.connected).toBe(true);
    socket.disconnect();

    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it('blocks a user outside the order', async () => {
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

    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        status: 'CREATED',
        totalAmountCents: 1000,
        currency: 'BRL',
      },
    });

    const outsiderToken = await jwtService.signAsync({
      sub: outsider.id,
      role: outsider.role,
    });
    const socket = await connectSocket(baseUrl, outsiderToken);

    const exceptionPromise = new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Expected exception not received.')), 5000);
      socket.once('exception', (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      });
    });

    socket.emit('joinRoom', order.id);
    const exception = await exceptionPromise;
    const message =
      typeof exception === 'string'
        ? exception
        : ((exception as { message?: string })?.message ?? '');

    expect(message).toContain('Order access denied');

    socket.disconnect();

    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.user.deleteMany({ where: { id: { in: [buyer.id, seller.id, outsider.id] } } });
  });
});
