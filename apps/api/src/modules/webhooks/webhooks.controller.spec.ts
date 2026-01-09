import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

describe('WebhooksController (integration)', () => {
  let app: INestApplication;
  const webhooksService = {
    registerEfiWebhook: jest.fn(),
    registerEfiWebhookEndpoint: jest.fn(),
    getMetrics: jest.fn(),
  };

  beforeAll(async () => {
    const allowGuard = { canActivate: () => true };

    const moduleRef = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [{ provide: WebhooksService, useValue: webhooksService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(allowGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts pix webhook payload', async () => {
    webhooksService.registerEfiWebhook.mockResolvedValue({ id: 'event-1' });

    await request(app.getHttpServer())
      .post('/webhooks/efi/pix')
      .send({ txid: 'tx-1', pix: [{ txid: 'tx-1' }] })
      .expect(201, { id: 'event-1' });

    expect(webhooksService.registerEfiWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ txid: 'tx-1' }),
    );
  });

  it('validates webhook registration input', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/efi/register')
      .send({ webhookUrl: 'not-a-url' })
      .expect(400);

    expect(webhooksService.registerEfiWebhookEndpoint).not.toHaveBeenCalled();
  });

  it('registers webhook endpoint with valid input', async () => {
    webhooksService.registerEfiWebhookEndpoint.mockResolvedValue({ ok: true });

    await request(app.getHttpServer())
      .post('/webhooks/efi/register')
      .send({ webhookUrl: 'https://example.com/webhook' })
      .expect(201, { ok: true });

    expect(webhooksService.registerEfiWebhookEndpoint).toHaveBeenCalledWith(
      'https://example.com/webhook',
    );
  });
});
