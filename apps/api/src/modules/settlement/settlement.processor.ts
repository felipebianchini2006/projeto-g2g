import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { AppLogger } from '../logger/logger.service';
import { RequestContextService } from '../request-context/request-context.service';
import { SettlementJobName, SETTLEMENT_QUEUE } from './settlement.queue';
import { SettlementService } from './settlement.service';

@Processor(SETTLEMENT_QUEUE)
export class SettlementProcessor extends WorkerHost {
  constructor(
    private readonly settlementService: SettlementService,
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async process(job: Job<{ orderId?: string; correlationId?: string }>) {
    if (job.name !== SettlementJobName.ReleaseOrder) {
      return;
    }
    await this.handleRelease(job);
  }

  private async handleRelease(job: Job<{ orderId?: string; correlationId?: string }>) {
    const { orderId, correlationId } = job.data;
    if (!orderId) {
      return;
    }

    const requestId = job.id?.toString() ?? correlationId ?? orderId;
    const correlation = correlationId ?? orderId;

    return this.requestContext.run({ requestId, correlationId: correlation }, async () => {
      try {
        await this.settlementService.releaseOrder(orderId, null, 'auto-release');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Settlement release failed';
        const stack = error instanceof Error ? error.stack : undefined;
        this.logger.error(message, stack, `SettlementWorker:${orderId}`);
        throw error;
      }
    });
  }
}
