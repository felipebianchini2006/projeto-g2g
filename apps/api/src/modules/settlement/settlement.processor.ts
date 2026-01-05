import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { AppLogger } from '../logger/logger.service';
import { SettlementJobName, SETTLEMENT_QUEUE } from './settlement.queue';
import { SettlementService } from './settlement.service';

@Processor(SETTLEMENT_QUEUE)
export class SettlementProcessor extends WorkerHost {
  constructor(
    private readonly settlementService: SettlementService,
    private readonly logger: AppLogger,
  ) {
    super();
  }

  async process(job: Job<{ orderId?: string }>) {
    if (job.name !== SettlementJobName.ReleaseOrder) {
      return;
    }
    await this.handleRelease(job);
  }

  private async handleRelease(job: Job<{ orderId?: string }>) {
    const orderId = job.data.orderId;
    if (!orderId) {
      return;
    }
    try {
      await this.settlementService.releaseOrder(orderId, null, 'auto-release');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Settlement release failed';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(message, stack, `SettlementWorker:${orderId}`);
      throw error;
    }
  }
}
