import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { LoggerModule } from '../logger/logger.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettlementModule } from '../settlement/settlement.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksProcessor } from './webhooks.processor';
import { WebhooksService } from './webhooks.service';
import { WebhookMetricsService } from './webhooks.metrics';
import { WEBHOOKS_QUEUE } from './webhooks.queue';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    AuthModule,
    EmailModule,
    OrdersModule,
    PaymentsModule,
    SettlementModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({ name: WEBHOOKS_QUEUE }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksProcessor, WebhookMetricsService],
})
export class WebhooksModule {}
