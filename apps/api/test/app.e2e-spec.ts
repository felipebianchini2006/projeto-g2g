import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/modules/prisma/prisma.service';
import { RedisService } from './../src/modules/redis/redis.service';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['DATABASE_URL'] =
      process.env['E2E_DATABASE_URL'] ??
      'postgresql://postgres:123456@localhost:5433/projeto_g2g_test';
    process.env['REDIS_URL'] = process.env['E2E_REDIS_URL'] ?? 'redis://localhost:6380';
    process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'test-secret';
    process.env['TOKEN_TTL'] = process.env['TOKEN_TTL'] ?? '900';
    process.env['REFRESH_TTL'] = process.env['REFRESH_TTL'] ?? '3600';

    const prismaMock = {
      $queryRaw: jest.fn().mockResolvedValue(1),
    };
    const redisMock = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

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

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.info).toMatchObject({ db: 'up', redis: 'up' });
  });
});
