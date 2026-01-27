import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { DirectChatService } from './direct-chat.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('direct-chats')
@UseGuards(JwtAuthGuard)
export class DirectChatController {
  constructor(private readonly directChatService: DirectChatService) { }

  @Get('threads')
  listThreads(@Req() req: AuthenticatedRequest) {
    return this.directChatService.listThreads(this.getUserId(req));
  }

  @Post('threads')
  createThread(@Req() req: AuthenticatedRequest, @Body() dto: CreateThreadDto) {
    return this.directChatService.createThread(this.getUserId(req), dto);
  }

  @Get('threads/:id/messages')
  listMessages(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.directChatService.listMessages(this.getUserId(req), threadId, query);
  }

  @Post('threads/:id/messages')
  createMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') threadId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.directChatService.createMessage(this.getUserId(req), threadId, dto);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new Error('Contexto de usuário ausente.');
    }
    return request.user.sub;
  }
}
