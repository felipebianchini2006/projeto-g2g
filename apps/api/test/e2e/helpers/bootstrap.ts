import type { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { JwtService } from '@nestjs/jwt';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';
import { EmailQueueService } from '../../../src/modules/email/email.service';
import { EmailSenderService, type EmailSendPayload } from '../../../src/modules/email/email-sender.service';
import { EMAIL_QUEUE } from '../../../src/modules/email/email.queue';
import { PrismaService } from '../../../src/modules/prisma/prisma.service';
import { TwilioClientService } from '../../../src/modules/twilio/twilio-client.service';
import { TwilioMessagingService } from '../../../src/modules/twilio/twilio-messaging.service';
import { TwilioVerifyService, type VerifyChannel } from '../../../src/modules/twilio/twilio-verify.service';
import { createTestApp } from '../../utils/create-test-app';
import { resetDatabase } from '../../utils/reset-db';

const { applyTestEnv } = require('../../test-env.cjs');

export class FakeEmailSender {
  calls: EmailSendPayload[] = [];
  shouldFail = false;
  error = new Error('FakeEmailSender failure');

  reset() {
    this.calls = [];
    this.shouldFail = false;
  }

  async send(payload: EmailSendPayload) {
    this.calls.push(payload);
    if (this.shouldFail) {
      throw this.error;
    }
  }
}

export class FakeEmailQueueService {
  enqueued: string[] = [];

  reset() {
    this.enqueued = [];
  }

  async enqueueEmail(emailOutboxId: string) {
    this.enqueued.push(emailOutboxId);
  }
}

export type FakeSmsCall = {
  to: string;
  body: string;
};

export class FakeTwilioMessaging {
  calls: FakeSmsCall[] = [];
  shouldFail = false;
  error = new Error('FakeTwilioMessaging failure');

  reset() {
    this.calls = [];
    this.shouldFail = false;
  }

  async sendSms(to: string, body: string) {
    this.calls.push({ to, body });
    if (this.shouldFail) {
      throw this.error;
    }
    return { sid: 'fake-sms' };
  }
}

export type FakeVerifySendCall = {
  to: string;
  channel: VerifyChannel;
};

export type FakeVerifyCheckCall = {
  to: string;
  code: string;
};

export class FakeTwilioVerify {
  sendCalls: FakeVerifySendCall[] = [];
  checkCalls: FakeVerifyCheckCall[] = [];
  approvedCode = '000000';

  reset() {
    this.sendCalls = [];
    this.checkCalls = [];
  }

  async sendVerification(to: string, channel: VerifyChannel) {
    this.sendCalls.push({ to, channel });
    return { status: 'pending' };
  }

  async checkVerification(to: string, code: string) {
    this.checkCalls.push({ to, code });
    return { status: code === this.approvedCode ? 'approved' : 'pending' };
  }
}

export type BootstrapResult = {
  app: INestApplication<App>;
  prisma: PrismaService;
  jwtService: JwtService;
  emailSender: FakeEmailSender;
  emailQueue: FakeEmailQueueService;
  twilioMessaging: FakeTwilioMessaging;
  twilioVerify: FakeTwilioVerify;
};

export const bootstrapTestApp = async (options?: {
  overrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}) => {
  applyTestEnv();

  const emailSender = new FakeEmailSender();
  const emailQueue = new FakeEmailQueueService();
  const twilioMessaging = new FakeTwilioMessaging();
  const twilioVerify = new FakeTwilioVerify();

  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSenderService)
    .useValue(emailSender)
    .overrideProvider(EmailQueueService)
    .useValue(emailQueue)
    .overrideProvider(TwilioMessagingService)
    .useValue(twilioMessaging)
    .overrideProvider(TwilioVerifyService)
    .useValue(twilioVerify)
    .overrideProvider(TwilioClientService)
    .useValue({ client: {} })
    .overrideProvider(getQueueToken(EMAIL_QUEUE))
    .useValue({
      opts: {
        connection: {
          url: process.env.E2E_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6380',
        },
      },
      add: jest.fn(),
    });

  if (options?.overrides) {
    builder = options.overrides(builder);
  }

  const moduleFixture = await builder.compile();
  const app = await createTestApp(moduleFixture);

  return {
    app,
    prisma: moduleFixture.get(PrismaService),
    jwtService: moduleFixture.get(JwtService),
    emailSender,
    emailQueue,
    twilioMessaging,
    twilioVerify,
  };
};

export const prismaCleanup = async (prisma: PrismaService) => resetDatabase(prisma);

export const getAuthToken = async (
  app: INestApplication,
  email: string,
  password: string,
) => {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return response.body.accessToken as string;
};
