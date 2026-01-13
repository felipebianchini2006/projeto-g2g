import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { DirectChatController } from './direct-chat.controller';
import { DirectChatService } from './direct-chat.service';

@Module({
  controllers: [DirectChatController],
  providers: [DirectChatService, PrismaService],
})
export class DirectChatModule {}
