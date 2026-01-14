import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DirectChatController } from './direct-chat.controller';
import { DirectChatService } from './direct-chat.service';

@Module({
  imports: [AuthModule],
  controllers: [DirectChatController],
  providers: [DirectChatService],
})
export class DirectChatModule {}
