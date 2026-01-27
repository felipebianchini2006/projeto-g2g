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
  prismaCleanup,
} from './helpers/bootstrap';

jest.setTimeout(60000);

describe('Auth forgot password (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let emailQueue: FakeEmailQueueService;
  let emailSender: FakeEmailSender;
  let twilioMessaging: FakeTwilioMessaging;
  let twilioVerify: FakeTwilioVerify;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
    emailQueue = boot.emailQueue;
    emailSender = boot.emailSender;
    twilioMessaging = boot.twilioMessaging;
    twilioVerify = boot.twilioVerify;
    await prismaCleanup(prisma);
  });

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = 'test';
  });

  beforeEach(async () => {
    await prismaCleanup(prisma);
    emailQueue.reset();
    emailSender.reset();
    twilioMessaging.reset();
    twilioVerify.reset();
  });

  it('returns success and enqueues reset email for existing user', async () => {
    const passwordHash = await bcrypt.hash('12345678', 10);
    await prisma.user.create({
      data: {
        email: 'buyer@email.com',
        passwordHash,
        role: 'USER',
      },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'buyer@email.com' })
      .expect(200);

    expect(response.body.success).toBe(true);

    const outbox = await prisma.emailOutbox.findFirst({
      where: { to: 'buyer@email.com' },
      orderBy: { createdAt: 'desc' },
    });

    expect(outbox).toBeTruthy();
    expect(outbox?.subject.toLowerCase()).toContain('senha');
    expect(outbox?.body).toContain('/conta/recuperar?token=');
    expect(emailQueue.enqueued).toContain(outbox?.id as string);
  });

  it('does not leak user existence and does not enqueue email for unknown user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'naoexiste@exemplo.com' })
      .expect(200);

    expect(response.body.success).toBe(true);

    const outbox = await prisma.emailOutbox.findMany({
      where: { to: 'naoexiste@exemplo.com' },
    });

    expect(outbox.length).toBe(0);
    expect(emailQueue.enqueued.length).toBe(0);
  });
});
