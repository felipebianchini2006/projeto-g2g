import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';

import { AppLogger } from '../logger/logger.service';
import { RequestContextService } from '../request-context/request-context.service';
import { OrdersService } from './orders.service';
import { ORDERS_QUEUE, OrdersJobName, buildRedisConfig } from './orders.queue';

@Injectable()
export class OrdersProcessor implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly ordersService: OrdersService,
    private readonly requestContext: RequestContextService,
  ) {}

  async onModuleInit() {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return;
    }
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const connection = buildRedisConfig(redisUrl);

    this.worker = new Worker(
      ORDERS_QUEUE,
      async (job: Job<{ orderId: string; correlationId?: string }>) => {
        const { orderId, correlationId } = job.data;
        if (!orderId) {
          return;
        }

        const requestId = job.id?.toString() ?? correlationId ?? orderId;
        const correlation = correlationId ?? orderId;

        await this.requestContext.run(
          { requestId, correlationId: correlation },
          async () => {
            if (job.name === OrdersJobName.Expire) {
              await this.ordersService.handleOrderExpiration(orderId);
              return;
            }

            if (job.name === OrdersJobName.AutoComplete) {
              await this.ordersService.handleAutoComplete(orderId);
            }
          },
        );
      },
      { connection },
    );

    this.worker.on('failed', (job?: Job, error?: Error) => {
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
