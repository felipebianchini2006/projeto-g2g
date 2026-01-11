import type { INestApplication } from '@nestjs/common';
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

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    applyTestEnv();

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

  it('registers, logs in, refreshes tokens, and accesses a protected route', async () => {
    const email = `user-${randomUUID()}@test.com`;
    const password = 'password123';

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password,
      })
      .expect(201);

    expect(registerResponse.body.user.email).toBe(email.toLowerCase());
    expect(registerResponse.body.accessToken).toBeDefined();
    expect(registerResponse.body.refreshToken).toBeDefined();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(200);

    expect(loginResponse.body.user.email).toBe(email.toLowerCase());
    expect(loginResponse.body.accessToken).toBeDefined();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: registerResponse.body.refreshToken })
      .expect(200);

    expect(refreshResponse.body.refreshToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).not.toEqual(registerResponse.body.refreshToken);

    const sessionsResponse = await request(app.getHttpServer())
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(Array.isArray(sessionsResponse.body)).toBe(true);
    expect(sessionsResponse.body.length).toBeGreaterThan(0);
  });
});
