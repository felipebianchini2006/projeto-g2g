import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';

import { AppLogger } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from '../request-context/request-context.service';
import { EmailJobName, EMAIL_QUEUE } from './email.queue';
import { EmailSenderService } from './email-sender.service';

type EmailJobData = {
  emailOutboxId: string;
  correlationId?: string;
};

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
    private readonly emailSender: EmailSenderService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    if (job.name !== EmailJobName.SendEmail) {
      return;
    }
    const correlationId = job.data.correlationId ?? job.data.emailOutboxId;
    const requestId = job.id?.toString() ?? correlationId;
    await this.requestContext.run({ requestId, correlationId }, () =>
      this.handleSend(job.data.emailOutboxId),
    );
  }

  private async handleSend(emailOutboxId: string) {
    const outbox = await this.prisma.emailOutbox.findUnique({
      where: { id: emailOutboxId },
    });

    if (!outbox) {
      return;
    }

    if (outbox.status === EmailStatus.SENT) {
      return;
    }

    try {
      await this.emailSender.send({
        to: outbox.to,
        subject: outbox.subject,
        body: outbox.body,
      });

      await this.prisma.emailOutbox.update({
        where: { id: outbox.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email send failed.';
      await this.prisma.emailOutbox.update({
        where: { id: outbox.id },
        data: {
          status: EmailStatus.FAILED,
          errorMessage: message,
        },
      });
      throw error;
    }
  }
}
