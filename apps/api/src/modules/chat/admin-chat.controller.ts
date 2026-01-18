import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ChatService } from './chat.service';
import { AdminChatRoomsQueryDto } from './dto/admin-chat-rooms-query.dto';
import { ChatMessagesQueryDto } from './dto/chat-messages-query.dto';

@Controller('admin/chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('rooms')
  async listRooms(@Query() query: AdminChatRoomsQueryDto) {
    return this.chatService.listAdminRooms(query.take, query.skip);
  }

  @Get('rooms/:orderId/messages')
  async listMessages(
    @Param('orderId') orderId: string,
    @Query() query: ChatMessagesQueryDto,
  ) {
    return this.chatService.listAdminMessages(orderId, query.take, query.cursor);
  }
}
