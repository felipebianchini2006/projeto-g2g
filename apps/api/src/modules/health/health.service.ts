import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EMAIL_QUEUE } from '../email/email.queue';
import { ORDERS_QUEUE, buildRedisConfig } from '../orders/orders.queue';
import { SETTLEMENT_QUEUE } from '../settlement/settlement.queue';
import { WEBHOOKS_QUEUE } from '../webhooks/webhooks.queue';

type HealthComponentStatus = 'up' | 'down';

type HealthPayload = {
  status: 'ok' | 'error' | 'ready';
  info: {
    db: HealthComponentStatus;
    redis: HealthComponentStatus;
    queues: Record<string, HealthComponentStatus>;
  };
  timestamp: string;
};

@Injectable()
export class HealthService implements OnModuleDestroy {
  private readonly queues: Record<string, Queue>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.getOrThrow<string>('REDIS_URL');
    const connection = buildRedisConfig(redisUrl);
    this.queues = {
      orders: new Queue(ORDERS_QUEUE, { connection }),
      settlement: new Queue(SETTLEMENT_QUEUE, { connection }),
      email: new Queue(EMAIL_QUEUE, { connection }),
      webhooks: new Queue(WEBHOOKS_QUEUE, { connection }),
    };
  }

  async onModuleDestroy() {
    await Promise.all(Object.values(this.queues).map((queue) => queue.close()));
  }

  async check(): Promise<HealthPayload> {
    const { info, errors } = await this.buildStatus();

    const payload: HealthPayload = {
      status: Object.keys(errors).length === 0 ? 'ok' : 'error',
      info,
      timestamp: new Date().toISOString(),
    };

    if (payload.status === 'error') {
      throw new ServiceUnavailableException({
        ...payload,
        errors,
      });
    }

    return payload;
  }

  async ready(): Promise<HealthPayload> {
    const { info, errors } = await this.buildStatus();
    const payload: HealthPayload = {
      status: Object.keys(errors).length === 0 ? 'ready' : 'error',
      info,
      timestamp: new Date().toISOString(),
    };

    if (payload.status === 'error') {
      throw new ServiceUnavailableException({
        ...payload,
        errors,
      });
    }

    return payload;
  }

  private async buildStatus() {
    const info: HealthPayload['info'] = {
      db: 'down',
      redis: 'down',
      queues: {},
    };
    const errors: Record<string, string> = {};

    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      info.db = 'up';
    } catch (error) {
      errors['db'] = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      await this.redisService.ping();
      info.redis = 'up';
    } catch (error) {
      errors['redis'] = error instanceof Error ? error.message : 'Unknown error';
    }

    const queueResults = await this.checkQueues();
    info.queues = queueResults.status;
    Object.assign(errors, queueResults.errors);

    return { info, errors };
  }

  private async checkQueues() {
    const status: Record<string, HealthComponentStatus> = {};
    const errors: Record<string, string> = {};
    const entries = Object.entries(this.queues);

    const results = await Promise.allSettled(entries.map(([, queue]) => queue.getJobCounts()));

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const result = results[index];
      if (!entry || !result) {
        continue;
      }
      const name = entry[0];
      if (result.status === 'fulfilled') {
        status[name] = 'up';
      } else {
        status[name] = 'down';
        errors[`queue:${name}`] =
          result.reason instanceof Error ? result.reason.message : 'Queue unreachable';
      }
    }

    return { status, errors };
  }
}
