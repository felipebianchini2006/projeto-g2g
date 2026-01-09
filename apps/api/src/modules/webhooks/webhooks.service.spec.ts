import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';

import { AppLogger } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { EfiClient } from '../payments/efi/efi-client.service';
import { RequestContextService } from '../request-context/request-context.service';
import { WEBHOOKS_QUEUE } from './webhooks.queue';
import { WebhookMetricsService } from './webhooks.metrics';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prismaService: PrismaService;
  let queueMock: { add: jest.Mock };
  let metricsMock: { increment: jest.Mock; snapshot: jest.Mock };

  beforeEach(async () => {
    const prismaMock = {
      webhookEvent: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;

    queueMock = {
      add: jest.fn(),
    };

    metricsMock = {
      increment: jest.fn(),
      snapshot: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: AppLogger,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
        },
        { provide: WebhookMetricsService, useValue: metricsMock },
        { provide: EfiClient, useValue: { registerWebhook: jest.fn() } },
        { provide: RequestContextService, useValue: { get: jest.fn() } },
        { provide: getQueueToken(WEBHOOKS_QUEUE), useValue: queueMock },
      ],
    }).compile();

    service = moduleRef.get(WebhooksService);
    prismaService = moduleRef.get(PrismaService);
  });

  it('stores and enqueues webhook payload', async () => {
    (prismaService.webhookEvent.create as jest.Mock).mockResolvedValue({
      id: 'event-1',
      eventId: 'evt-123',
      txid: 'tx-1',
    });

    const result = await service.registerEfiWebhook({ txid: 'tx-1', pix: [{ txid: 'tx-1' }] });

    expect(prismaService.webhookEvent.create).toHaveBeenCalled();
    expect(queueMock.add).toHaveBeenCalled();
    expect(metricsMock.increment).toHaveBeenCalledWith('received', 'tx-1');
    expect(result).toEqual({ id: 'event-1', eventId: 'evt-123' });
  });

  it('deduplicates webhook payloads', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '5.20.0',
    });

    (prismaService.webhookEvent.create as jest.Mock).mockRejectedValue(error);
    (prismaService.webhookEvent.findUnique as jest.Mock).mockResolvedValue({
      id: 'event-1',
      eventId: 'evt-dup',
      processedAt: null,
    });

    const result = await service.registerEfiWebhook({ txid: 'tx-dup' });

    expect(metricsMock.increment).toHaveBeenCalledWith('duplicated', 'tx-dup');
    expect(queueMock.add).toHaveBeenCalled();
    expect(result).toEqual({ duplicate: true });
  });
});
