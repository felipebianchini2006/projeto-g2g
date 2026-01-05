import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

import { AppLogger } from '../logger/logger.service';
import { OrdersService } from './orders.service';
import { ORDERS_QUEUE, OrdersJobName, buildRedisConfig } from './orders.queue';

@Injectable()
export class OrdersProcessor implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly ordersService: OrdersService,
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return;
    }
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const connection = new IORedis(buildRedisConfig(redisUrl));

    this.worker = new Worker(
      ORDERS_QUEUE,
      async (job) => {
        const { orderId } = job.data as { orderId: string };
        if (!orderId) {
          return;
        }

        if (job.name === OrdersJobName.Expire) {
          await this.ordersService.handleOrderExpiration(orderId);
          return;
        }

        if (job.name === OrdersJobName.AutoComplete) {
          await this.ordersService.handleAutoComplete(orderId);
        }
      },
      { connection },
    );

    this.worker.on('failed', (job, error) => {
      const message = error instanceof Error ? error.message : 'Job failed';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        message,
        stack,
        `OrdersWorker:${job?.name ?? 'unknown'}`,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
