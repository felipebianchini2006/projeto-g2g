import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureOrderAccess(orderId: string, userId: string, role: UserRole) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, buyerId: true, sellerId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (role === 'ADMIN') {
      return order;
    }

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('Order access denied.');
    }

    return order;
  }

  async getOrCreateRoom(orderId: string) {
    return this.prisma.chatRoom.upsert({
      where: { orderId },
      create: {
        order: { connect: { id: orderId } },
      },
      update: {},
    });
  }

  async createMessage(orderId: string, senderId: string, content: string) {
    const room = await this.getOrCreateRoom(orderId);
    return this.prisma.chatMessage.create({
      data: {
        roomId: room.id,
        senderId,
        type: 'TEXT',
        content,
      },
    });
  }

  async listMessages(orderId: string, take = 20, cursor?: string) {
    const limit = Math.max(1, Math.min(take, 100));
    const parsedCursor = cursor ? new Date(cursor) : null;
    const isValidCursor = parsedCursor instanceof Date && !Number.isNaN(parsedCursor.getTime());
    const where = isValidCursor
      ? {
          room: { orderId },
          createdAt: { lt: parsedCursor },
        }
      : { room: { orderId } };

    return this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
