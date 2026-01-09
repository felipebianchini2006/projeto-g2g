import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UserRole } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { randomUUID } from 'crypto';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { RedisService } from './../src/modules/redis/redis.service';

type MockUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

type MockSession = {
  id: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
};

type MockRefreshToken = {
  id: string;
  userId: string;
  sessionId?: string | null;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
};

type MockResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
};

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  session: {
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  refreshToken: {
    findUnique: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  passwordResetToken: {
    findUnique: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const createPrismaMock = (): PrismaMock => {
  const users: MockUser[] = [];
  const sessions: MockSession[] = [];
  const refreshTokens: MockRefreshToken[] = [];
  const resetTokens: MockResetToken[] = [];

  const prismaMock: PrismaMock = {
    user: {
      findUnique: jest.fn(({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) {
          return users.find((user) => user.email === where.email) ?? null;
        }
        if (where.id) {
          return users.find((user) => user.id === where.id) ?? null;
        }
        return null;
      }),
      create: jest.fn(({ data }: { data: Omit<MockUser, 'id' | 'createdAt' | 'updatedAt'> }) => {
        const now = new Date();
        const user: MockUser = {
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        users.push(user);
        return user;
      }),
      update: jest.fn(({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
        const user = users.find((entry) => entry.id === where.id);
        if (!user) {
          throw new Error('User not found');
        }
        Object.assign(user, data, { updatedAt: new Date() });
        return user;
      }),
    },
    session: {
      create: jest.fn(
        ({ data }: { data: Omit<MockSession, 'id' | 'createdAt' | 'updatedAt' | 'revokedAt'> }) => {
          const now = new Date();
          const session: MockSession = {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            revokedAt: null,
            ...data,
          };
          sessions.push(session);
          return session;
        },
      ),
      updateMany: jest.fn(
        ({ where, data }: { where: Partial<MockSession>; data: Partial<MockSession> }) => {
          let count = 0;
          sessions.forEach((session) => {
            if (
              (where.id ? session.id === where.id : true) &&
              (where.userId ? session.userId === where.userId : true) &&
              (where.revokedAt === null ? session.revokedAt === null : true)
            ) {
              Object.assign(session, data, { updatedAt: new Date() });
              count += 1;
            }
          });
          return { count };
        },
      ),
    },
    refreshToken: {
      findUnique: jest.fn(
        ({
          where,
          include,
        }: {
          where: { tokenHash: string };
          include?: { user?: boolean; session?: boolean };
        }) => {
          const token = refreshTokens.find((entry) => entry.tokenHash === where.tokenHash);
          if (!token) {
            return null;
          }

          const payload: Record<string, unknown> = { ...token };
          if (include?.user) {
            payload.user = users.find((user) => user.id === token.userId) ?? null;
          }
          if (include?.session) {
            payload.session = sessions.find((session) => session.id === token.sessionId) ?? null;
          }
          return payload;
        },
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: Omit<MockRefreshToken, 'id' | 'createdAt' | 'updatedAt' | 'revokedAt'>;
        }) => {
          const now = new Date();
          const token: MockRefreshToken = {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            revokedAt: null,
            ...data,
          };
          refreshTokens.push(token);
          return token;
        },
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: Partial<MockRefreshToken>;
          data: Partial<MockRefreshToken>;
        }) => {
          let count = 0;
          refreshTokens.forEach((token) => {
            if (
              (where.id ? token.id === where.id : true) &&
              (where.userId ? token.userId === where.userId : true) &&
              (where.revokedAt === null ? token.revokedAt === null : true)
            ) {
              Object.assign(token, data, { updatedAt: new Date() });
              count += 1;
            }
          });
          return { count };
        },
      ),
    },
    passwordResetToken: {
      findUnique: jest.fn(
        ({ where, include }: { where: { tokenHash: string }; include?: { user?: boolean } }) => {
          const token = resetTokens.find((entry) => entry.tokenHash === where.tokenHash);
          if (!token) {
            return null;
          }
          const payload: Record<string, unknown> = { ...token };
          if (include?.user) {
            payload.user = users.find((user) => user.id === token.userId) ?? null;
          }
          return payload;
        },
      ),
      create: jest.fn(
        ({ data }: { data: Omit<MockResetToken, 'id' | 'createdAt' | 'updatedAt' | 'usedAt'> }) => {
          const now = new Date();
          const token: MockResetToken = {
            id: randomUUID(),
            createdAt: now,
            updatedAt: now,
            usedAt: null,
            ...data,
          };
          resetTokens.push(token);
          return token;
        },
      ),
      updateMany: jest.fn(
        ({ where, data }: { where: Partial<MockResetToken>; data: Partial<MockResetToken> }) => {
          let count = 0;
          resetTokens.forEach((token) => {
            if (
              (where.id ? token.id === where.id : true) &&
              (where.userId ? token.userId === where.userId : true) &&
              (where.usedAt === null ? token.usedAt === null : true)
            ) {
              Object.assign(token, data, { updatedAt: new Date() });
              count += 1;
            }
          });
          return { count };
        },
      ),
    },
    $transaction: jest.fn(async (callback: (client: PrismaMock) => Promise<unknown>) => {
      return callback(prismaMock);
    }),
  };

  return prismaMock;
};

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['JWT_SECRET'] = 'test-secret';
    process.env['TOKEN_TTL'] = '900';
    process.env['REFRESH_TTL'] = '3600';
    process.env['DATABASE_URL'] =
      process.env['E2E_DATABASE_URL'] ??
      'postgresql://postgres:123456@localhost:5433/projeto_g2g_test';
    process.env['REDIS_URL'] = process.env['E2E_REDIS_URL'] ?? 'redis://localhost:6380';

    const prismaMock = createPrismaMock();
    const redisMock = { ping: jest.fn().mockResolvedValue('PONG') };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, logs in, and refreshes tokens', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user@test.com',
        password: 'password123',
      })
      .expect(201);

    expect(registerResponse.body.user.email).toBe('user@test.com');
    expect(registerResponse.body.accessToken).toBeDefined();
    expect(registerResponse.body.refreshToken).toBeDefined();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user@test.com',
        password: 'password123',
      })
      .expect(200);

    expect(loginResponse.body.user.email).toBe('user@test.com');
    expect(loginResponse.body.accessToken).toBeDefined();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(200);

    expect(refreshResponse.body.refreshToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).not.toEqual(registerResponse.body.refreshToken);
  });
});
