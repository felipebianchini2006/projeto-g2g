import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { AppLogger } from '../logger/logger.service';
import { RequestContextService } from '../request-context/request-context.service';
import { ORDERS_QUEUE, OrdersJobName, buildRedisConfig } from './orders.queue';

@Injectable()
export class OrdersQueueService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly requestContext: RequestContextService,
  ) {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const connection = buildRedisConfig(redisUrl);
    this.queue = new Queue(ORDERS_QUEUE, { connection });

    this.queue.on('error', (error: Error) => {
      const message = error instanceof Error ? error.message : 'Queue error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(message, stack, 'OrdersQueue');
    });
  }

  async scheduleOrderExpiration(orderId: string, expiresAt?: Date | null) {
    if (!expiresAt) {
      return;
    }
    const delay = Math.max(expiresAt.getTime() - Date.now(), 0);
    await this.addJob(OrdersJobName.Expire, orderId, delay);
  }

  async scheduleAutoComplete(orderId: string, delayMs: number) {
    const delay = Math.max(delayMs, 0);
    await this.addJob(OrdersJobName.AutoComplete, orderId, delay);
  }

  private async addJob(name: string, orderId: string, delay: number) {
    const correlationId = this.requestContext.get()?.correlationId ?? orderId;
    try {
      await this.queue.add(
        name,
        { orderId, correlationId },
        {
          jobId: `${name}-${orderId}`,
          delay,
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

  async onModuleDestroy() {
    await this.queue.close();
  }
}
