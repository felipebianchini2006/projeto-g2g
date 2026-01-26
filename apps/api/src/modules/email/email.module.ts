import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailProcessor } from './email.processor';
import { EMAIL_QUEUE } from './email.queue';
import { EmailQueueService } from './email.service';
import { EmailSenderService } from './email-sender.service';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [EmailQueueService, EmailSenderService, EmailProcessor],
  exports: [EmailQueueService, EmailSenderService],
})
export class EmailModule {}
