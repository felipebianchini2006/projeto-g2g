import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatMessagesQueryDto } from './dto/chat-messages-query.dto';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('chat')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('orders/:id/messages')
  @Throttle({ chat: { ttl: 60, limit: 30 } })
  async listMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Query() query: ChatMessagesQueryDto,
  ) {
    const user = this.getUser(req);
    await this.chatService.ensureOrderAccess(orderId, user.sub, user.role);
    return this.chatService.listMessages(orderId, query.take, query.cursor);
  }

  private getUser(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user;
  }
}
