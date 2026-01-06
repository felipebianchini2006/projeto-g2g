import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { EmailModule } from '../email/email.module';
import { LoggerModule } from '../logger/logger.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SettingsModule } from '../settings/settings.module';
import { SettlementProcessor } from './settlement.processor';
import { SettlementService } from './settlement.service';
import { SETTLEMENT_QUEUE } from './settlement.queue';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    LoggerModule,
    PaymentsModule,
    SettingsModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({ name: SETTLEMENT_QUEUE }),
  ],
  providers: [SettlementService, SettlementProcessor],
  exports: [SettlementService],
})
export class SettlementModule {}
