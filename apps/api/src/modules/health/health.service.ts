import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

type HealthComponentStatus = 'up' | 'down';

type HealthPayload = {
  status: 'ok' | 'error';
  info: {
    db: HealthComponentStatus;
    redis: HealthComponentStatus;
  };
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthPayload> {
    const info: HealthPayload['info'] = { db: 'down', redis: 'down' };
    const errors: Record<string, string> = {};

    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      info.db = 'up';
    } catch (error) {
      errors.db = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      await this.redisService.ping();
      info.redis = 'up';
    } catch (error) {
      errors.redis = error instanceof Error ? error.message : 'Unknown error';
    }

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

  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}