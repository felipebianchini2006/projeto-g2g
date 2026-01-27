import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: NotificationQueryDto) {
    const userId = this.getUserId(req);
    return this.notificationsService.listNotifications(userId, query);
  }

  @Post(':id/read')
  markRead(@Req() req: AuthenticatedRequest, @Param('id') notificationId: string) {
    const userId = this.getUserId(req);
    return this.notificationsService.markRead(userId, notificationId);
  }

  @Post('read-all')
  markAllRead(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.notificationsService.markAllRead(userId);
  }

  @Delete(':id')
  deleteOne(@Req() req: AuthenticatedRequest, @Param('id') notificationId: string) {
    const userId = this.getUserId(req);
    return this.notificationsService.deleteOne(userId, notificationId);
  }

  @Delete()
  clearAll(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.notificationsService.clearAll(userId);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }
    return request.user.sub;
  }
}
