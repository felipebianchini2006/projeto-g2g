import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  ServiceUnavailableException,
  TooManyRequestsException,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { SupportChatRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppLogger } from '../logger/logger.service';
import { SupportChatMessageDto } from './dto/support-chat-message.dto';
import { SupportAiService } from './support-ai.service';
import { SupportChatRateLimiter } from './support-chat.rate-limiter';
import { SupportChatService } from './support-chat.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 16;

@Controller('support/chat')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class SupportChatController {
  constructor(
    private readonly supportChatService: SupportChatService,
    private readonly supportAiService: SupportAiService,
    private readonly rateLimiter: SupportChatRateLimiter,
    private readonly logger: AppLogger,
  ) {}

  @Post('sessions')
  @Throttle({ chat: { ttl: 60, limit: 10 } })
  async createSession(@Req() req: AuthenticatedRequest) {
    const user = this.getUser(req);
    const session = await this.supportChatService.createSession(user.sub);
    return { sessionId: session.id };
  }

  @Get('sessions/:id/messages')
  @Throttle({ chat: { ttl: 60, limit: 30 } })
  async listMessages(@Req() req: AuthenticatedRequest, @Param('id') sessionId: string) {
    const user = this.getUser(req);
    await this.supportChatService.ensureSessionAccess(sessionId, {
      id: user.sub,
      role: user.role,
    });
    return this.supportChatService.listMessages(sessionId);
  }

  @Post('sessions/:id/messages')
  @Throttle({ chat: { ttl: 60, limit: 20 } })
  @HttpCode(200)
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
    @Body() dto: SupportChatMessageDto,
  ) {
    const user = this.getUser(req);
    const session = await this.supportChatService.ensureSessionAccess(sessionId, {
      id: user.sub,
      role: user.role,
    });

    const message = dto.message.trim();
    if (!message) {
      throw new BadRequestException('Message cannot be empty.');
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestException('Message too long.');
    }

    const rateKey = `${user.sub}:${req.ip ?? 'unknown'}`;
    const rate = this.rateLimiter.check(rateKey);
    if (!rate.allowed) {
      throw new TooManyRequestsException(rate.reason ?? 'Rate limit exceeded.');
    }

    const userMessage = await this.supportChatService.createMessage(
      session,
      SupportChatRole.USER,
      message,
    );

    try {
      const recent = await this.supportChatService.listRecentMessages(sessionId, MAX_HISTORY);
      const aiText = await this.supportAiService.generateReply(recent.reverse());
      const aiMessage = await this.supportChatService.createMessage(
        session,
        SupportChatRole.AI,
        aiText,
      );

      return { userMessage, aiMessage };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Support AI failed.';
      this.logger.error(
        errorMessage,
        error instanceof Error ? error.stack : undefined,
        'SupportChatController',
      );
      throw new ServiceUnavailableException(
        'Nao foi possivel responder agora. Tente novamente em instantes.',
      );
    }
  }

  private getUser(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user;
  }
}
