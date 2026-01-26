/* eslint-disable @typescript-eslint/unbound-method */
import { EmailStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import sgMail from '@sendgrid/mail';

import { EmailProcessor } from './email.processor';
import { EmailJobName } from './email.queue';
import { EmailSenderService } from './email-sender.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AppLogger } from '../logger/logger.service';
import type { RequestContextService } from '../request-context/request-context.service';
import type { ConfigService } from '@nestjs/config';

jest.mock('@sendgrid/mail', () => ({
  __esModule: true,
  default: {
    setApiKey: jest.fn(),
    send: jest.fn(),
  },
}));

describe('EmailProcessor', () => {
  let prismaService: PrismaService;
  let processor: EmailProcessor;

  beforeEach(() => {
    const prismaMock = {
      emailOutbox: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as PrismaService;

    const logger = {
      error: jest.fn(),
    } as unknown as AppLogger;

    const requestContext = {
      run: jest.fn(async (_ctx: unknown, cb: () => Promise<unknown>) => cb()),
    } as unknown as RequestContextService;

    const configService = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'SENDGRID_API_KEY') {
          return 'sg-test';
        }
        if (key === 'SENDGRID_FROM_EMAIL') {
          return 'noreply@test.com';
        }
        return '';
      }),
      get: jest.fn(),
    } as unknown as ConfigService;

    const sender = new EmailSenderService(configService, logger);
    processor = new EmailProcessor(prismaMock, logger, requestContext, sender);
    prismaService = prismaMock;
  });

  it('marks outbox as sent on success', async () => {
    const outbox = {
      id: 'outbox-1',
      to: 'user@test.com',
      subject: 'Subject',
      body: 'Body',
      status: EmailStatus.PENDING,
    };

    (prismaService.emailOutbox.findUnique as jest.Mock).mockResolvedValue(outbox);
    (sgMail.send as jest.Mock).mockResolvedValue([{ statusCode: 202 }]);

    const job = {
      name: EmailJobName.SendEmail,
      data: { emailOutboxId: 'outbox-1' },
      id: 'job-1',
    } as unknown as Job;

    await processor.process(job);

    expect(prismaService.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-1' },
        data: expect.objectContaining({
          status: EmailStatus.SENT,
          sentAt: expect.any(Date),
          errorMessage: null,
        }),
      }),
    );
  });

  it('marks outbox as failed on error', async () => {
    const outbox = {
      id: 'outbox-2',
      to: 'user@test.com',
      subject: 'Subject',
      body: 'Body',
      status: EmailStatus.PENDING,
    };

    (prismaService.emailOutbox.findUnique as jest.Mock).mockResolvedValue(outbox);
    (sgMail.send as jest.Mock).mockRejectedValue(new Error('send failed'));

    const job = {
      name: EmailJobName.SendEmail,
      data: { emailOutboxId: 'outbox-2' },
      id: 'job-2',
    } as unknown as Job;

    await expect(processor.process(job)).rejects.toThrow('send failed');

    expect(prismaService.emailOutbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-2' },
        data: expect.objectContaining({
          status: EmailStatus.FAILED,
          errorMessage: 'send failed',
        }),
      }),
    );
  });
});
