import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../logger/logger.module';
import { SupportAiService } from './support-ai.service';
import { SupportChatController } from './support-chat.controller';
import { SupportChatRateLimiter } from './support-chat.rate-limiter';
import { SupportChatService } from './support-chat.service';

@Module({
  imports: [AuthModule, LoggerModule],
  controllers: [SupportChatController],
  providers: [SupportAiService, SupportChatService, SupportChatRateLimiter],
})
export class SupportChatModule {}
