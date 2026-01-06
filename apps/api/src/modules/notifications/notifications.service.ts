import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotifications(userId: string, query: NotificationQueryDto) {
    const take = query.take ?? 20;
    const parsedCursor = query.cursor ? new Date(query.cursor) : null;
    const isValidCursor =
      parsedCursor instanceof Date && !Number.isNaN(parsedCursor.getTime());
    const where = {
      userId,
      ...(query.unread ? { readAt: null } : {}),
      ...(isValidCursor ? { createdAt: { lt: parsedCursor } } : {}),
    };

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
}
