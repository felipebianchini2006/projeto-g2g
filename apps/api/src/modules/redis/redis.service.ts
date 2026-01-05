import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';

import { AppLogger } from '../logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientType;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.client = createClient({
      url: this.configService.getOrThrow<string>('REDIS_URL'),
    });

    this.client.on('error', (error) => {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(message, stack, 'RedisService');
    });
  }

  async onModuleInit() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async ping() {
    return this.client.ping();
  }

  getClient() {
    return this.client;
  }
}
