import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { RequestContextService } from '../request-context/request-context.service';
import { EmailJobName, EMAIL_QUEUE } from './email.queue';

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue,
    private readonly requestContext: RequestContextService,
  ) {}

  async enqueueEmail(emailOutboxId: string) {
    const correlationId = this.requestContext.get()?.correlationId ?? emailOutboxId;
    try {
      await this.queue.add(
        EmailJobName.SendEmail,
        { emailOutboxId, correlationId },
        {
          jobId: `email-${emailOutboxId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('Job already exists')) {
        return;
      }
      throw error;
    }
  }
}
