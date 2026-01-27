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
  getAuthToken,
  prismaCleanup,
} from './helpers/bootstrap';

jest.setTimeout(60000);

describe('Wallet payout verification (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let twilioVerify: FakeTwilioVerify;
  let emailSender: FakeEmailSender;
  let emailQueue: FakeEmailQueueService;
  let twilioMessaging: FakeTwilioMessaging;

  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
    twilioVerify = boot.twilioVerify;
    emailSender = boot.emailSender;
    emailQueue = boot.emailQueue;
    twilioMessaging = boot.twilioMessaging;

    await prismaCleanup(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prismaCleanup(prisma);
    twilioVerify.reset();
    emailSender.reset();
    emailQueue.reset();
    twilioMessaging.reset();
  });

  const setupSellerWithBalance = async () => {
    const passwordHash = await bcrypt.hash('12345678', 10);
    const createdAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const seller = await prisma.user.create({
      data: {
        email: 'seller@email.com',
        passwordHash,
        role: 'SELLER',
        phoneE164: '+5511988888888',
        phoneVerifiedAt: new Date(),
        createdAt,
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        userId: seller.id,
        type: 'CREDIT',
        state: 'AVAILABLE',
        source: 'ORDER_PAYMENT',
        amountCents: 50000,
        currency: 'BRL',
        description: 'Saldo disponivel teste',
      },
    });

    return seller;
  };

  const payoutRequestPayload = {
    amountCents: 10000,
    pixKey: 'pix-chave-teste',
    beneficiaryName: 'Seller Teste',
  };

  it('requests payout verification and sends verify codes', async () => {
    const seller = await setupSellerWithBalance();
    const token = await getAuthToken(app, seller.email, '12345678');

    const response = await request(app.getHttpServer())
      .post('/wallet/payouts/request')
      .set('Authorization', `Bearer ${token}`)
      .send(payoutRequestPayload)
      .expect(201);

    expect(response.body.status).toBe('verificationRequired');
    expect(response.body.payoutDraftId).toBeDefined();

    const draft = await prisma.payoutDraft.findUnique({
      where: { id: response.body.payoutDraftId },
    });

    expect(draft).toBeTruthy();
    expect(draft?.status).toBe('PENDING');
    expect(draft?.expiresAt).toBeInstanceOf(Date);

    const now = Date.now();
    const expiresAt = draft?.expiresAt.getTime() ?? 0;
    expect(expiresAt).toBeGreaterThan(now + 8 * 60 * 1000);
    expect(expiresAt).toBeLessThan(now + 12 * 60 * 1000);

    expect(twilioVerify.sendCalls.length).toBe(2);
    const channels = twilioVerify.sendCalls.map((call) => call.channel).sort();
    expect(channels).toEqual(['email', 'sms']);
    const targets = twilioVerify.sendCalls.map((call) => call.to).sort();
    expect(targets).toEqual([seller.email, seller.phoneE164].sort());
  });

  it('confirms payout when codes are approved', async () => {
    const seller = await setupSellerWithBalance();
    const token = await getAuthToken(app, seller.email, '12345678');

    const requestResponse = await request(app.getHttpServer())
      .post('/wallet/payouts/request')
      .set('Authorization', `Bearer ${token}`)
      .send(payoutRequestPayload)
      .expect(201);

    const confirmResponse = await request(app.getHttpServer())
      .post('/wallet/payouts/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        payoutDraftId: requestResponse.body.payoutDraftId,
        codeEmail: '000000',
        codeSms: '000000',
      })
      .expect(201);

    expect(confirmResponse.body.id).toBeDefined();

    const payout = await prisma.payout.findUnique({
      where: { id: confirmResponse.body.id },
    });
    expect(payout).toBeTruthy();

    const updatedDraft = await prisma.payoutDraft.findUnique({
      where: { id: requestResponse.body.payoutDraftId },
    });
    expect(updatedDraft?.status).toBe('CONFIRMED');
  });

  it('rejects payout confirmation with invalid codes', async () => {
    const seller = await setupSellerWithBalance();
    const token = await getAuthToken(app, seller.email, '12345678');

    const requestResponse = await request(app.getHttpServer())
      .post('/wallet/payouts/request')
      .set('Authorization', `Bearer ${token}`)
      .send(payoutRequestPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/wallet/payouts/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({
        payoutDraftId: requestResponse.body.payoutDraftId,
        codeEmail: '111111',
        codeSms: '000000',
      })
      .expect(403);

    const payouts = await prisma.payout.findMany({ where: { userId: seller.id } });
    expect(payouts.length).toBe(0);

    const draft = await prisma.payoutDraft.findUnique({
      where: { id: requestResponse.body.payoutDraftId },
    });

    expect(draft?.status).not.toBe('CONFIRMED');
  });
});
