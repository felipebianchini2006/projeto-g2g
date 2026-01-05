import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { ChatRateLimiter } from './chat.rate-limiter';
import { ChatService } from './chat.service';

@Module({
  imports: [AuthModule],
  providers: [ChatGateway, ChatService, ChatRateLimiter],
})
export class ChatModule {}
