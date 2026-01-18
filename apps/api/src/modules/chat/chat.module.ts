import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { AdminChatController } from './admin-chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRateLimiter } from './chat.rate-limiter';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule],
  controllers: [ChatController, AdminChatController],
  providers: [ChatGateway, ChatService, ChatRateLimiter],
})
export class ChatModule {}
