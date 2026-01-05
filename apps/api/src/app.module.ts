import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { envSchema } from './config/env.schema';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ListingsModule } from './modules/listings/listings.module';
import { LoggerModule } from './modules/logger/logger.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
      expandVariables: true,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60, limit: 100 },
      { name: 'auth', ttl: 60, limit: 10 },
      { name: 'chat', ttl: 60, limit: 30 },
    ]),
    LoggerModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    ListingsModule,
    OrdersModule,
    WebhooksModule,
  ],
})
export class AppModule {}
