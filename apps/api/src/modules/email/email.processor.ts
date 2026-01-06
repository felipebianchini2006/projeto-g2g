import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';

import { AppLogger } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailJobName, EMAIL_QUEUE } from './email.queue';

type EmailJobData = {
  emailOutboxId: string;
};

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    if (job.name !== EmailJobName.SendEmail) {
      return;
    }
    await this.handleSend(job.data.emailOutboxId);
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
      this.logger.log(
        `Mock email send: ${outbox.to} | ${outbox.subject}`,
        `Email:${emailOutboxId}`,
      );

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
