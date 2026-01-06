import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRateLimiter } from './chat.rate-limiter';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ChatRateLimiter],
})
export class ChatModule {}
