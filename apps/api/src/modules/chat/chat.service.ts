import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type AdminChatRoomSummary = {
  id: string;
  orderId: string;
  orderStatus: string;
  orderCreatedAt: Date;
  buyer: { id: string; email: string; fullName: string | null } | null;
  seller: { id: string; email: string; fullName: string | null } | null;
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date;
    senderId: string;
    deletedAt: Date | null;
    type: string;
  } | null;
  messageCount: number;
};

type AdminChatMessage = {
  id: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  type: string;
  sender: { id: string; email: string; fullName: string | null; role: UserRole };
};

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
    const room = await this.getOrCreateRoom(orderId);
    const limit = Math.max(1, Math.min(take, 100));
    const parsedCursor = cursor ? new Date(cursor) : null;
    const isValidCursor = parsedCursor instanceof Date && !Number.isNaN(parsedCursor.getTime());
    const where = isValidCursor
      ? {
          roomId: room.id,
          createdAt: { lt: parsedCursor },
        }
      : { roomId: room.id };

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const readReceipts = await this.prisma.chatRoomRead.findMany({
      where: { roomId: room.id },
      select: { userId: true, lastReadAt: true },
    });

    return { messages, readReceipts, roomId: room.id };
  }

  async listAdminRooms(take = 50, skip = 0) {
    const safeTake = Math.max(1, Math.min(take, 200));
    const safeSkip = Math.max(0, skip);

    const [rooms, total] = await this.prisma.$transaction([
      this.prisma.chatRoom.findMany({
        skip: safeSkip,
        take: safeTake,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderId: true,
          createdAt: true,
          order: {
            select: {
              status: true,
              createdAt: true,
              buyer: { select: { id: true, email: true, fullName: true } },
              seller: { select: { id: true, email: true, fullName: true } },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              deletedAt: true,
              type: true,
            },
          },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.chatRoom.count(),
    ]);

    const items: AdminChatRoomSummary[] = rooms.map((room) => ({
      id: room.id,
      orderId: room.orderId,
      orderStatus: room.order.status,
      orderCreatedAt: room.order.createdAt,
      buyer: room.order.buyer,
      seller: room.order.seller,
      lastMessage: room.messages[0] ?? null,
      messageCount: room._count.messages,
    }));

    return { items, total, take: safeTake, skip: safeSkip };
  }

  async listAdminMessages(orderId: string, take = 50, cursor?: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { orderId },
      select: { id: true },
    });

    if (!room) {
      return { roomId: null, messages: [] as AdminChatMessage[] };
    }

    const limit = Math.max(1, Math.min(take, 200));
    const parsedCursor = cursor ? new Date(cursor) : null;
    const isValidCursor = parsedCursor instanceof Date && !Number.isNaN(parsedCursor.getTime());
    const where = isValidCursor
      ? {
          roomId: room.id,
          createdAt: { lt: parsedCursor },
        }
      : { roomId: room.id };

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
        type: true,
        sender: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });

    return { roomId: room.id, messages };
  }

  async updateMessage(messageId: string, userId: string, role: UserRole, content: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, deletedAt: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found.');
    }
    if (message.deletedAt) {
      throw new ForbiddenException('Message deleted.');
    }
    if (role !== UserRole.ADMIN && message.senderId !== userId) {
      throw new ForbiddenException('Only the author can edit.');
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: { room: { select: { orderId: true } } },
    });
  }

  async deleteMessage(messageId: string, userId: string, role: UserRole) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true, deletedAt: true },
    });
    if (!message) {
      throw new NotFoundException('Message not found.');
    }
    if (role !== UserRole.ADMIN && message.senderId !== userId) {
      throw new ForbiddenException('Only the author can delete.');
    }

    const deletedAt = message.deletedAt ?? new Date();
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { content: '', deletedAt },
      include: { room: { select: { orderId: true } } },
    });
  }

  async markRead(orderId: string, userId: string, readAt?: Date) {
    const room = await this.getOrCreateRoom(orderId);
    const lastReadAt = readAt ?? new Date();
    const receipt = await this.prisma.chatRoomRead.upsert({
      where: { roomId_userId: { roomId: room.id, userId } },
      update: { lastReadAt },
      create: { roomId: room.id, userId, lastReadAt },
    });
    return { roomId: room.id, userId, lastReadAt: receipt.lastReadAt };
  }
}
