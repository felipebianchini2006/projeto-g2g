import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateThreadDto } from './dto/create-thread.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';

const getEmailPrefix = (email: string) => email.split('@')[0] || 'usuario';

@Injectable()
export class DirectChatService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePair(userId: string, targetId: string) {
    return userId < targetId ? [userId, targetId] : [targetId, userId];
  }

  private toDisplayName(fullName: string | null, email: string) {
    const trimmed = fullName?.trim();
    if (trimmed) {
      return trimmed;
    }
    const prefix = getEmailPrefix(email);
    return `Usuario ${prefix}`;
  }

  private async ensureParticipant(userId: string, threadId: string) {
    const thread = await this.prisma.directChatThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        userAId: true,
        userBId: true,
      },
    });
    if (!thread) {
      throw new NotFoundException('Chat not found.');
    }
    if (thread.userAId !== userId && thread.userBId !== userId) {
      throw new ForbiddenException('Chat access denied.');
    }
    return thread;
  }

  async listThreads(userId: string) {
    const threads = await this.prisma.directChatThread.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        userB: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return threads.map((thread) => {
      const otherUser = thread.userAId === userId ? thread.userB : thread.userA;
      const lastMessage = thread.messages[0];
      return {
        id: thread.id,
        updatedAt: thread.updatedAt,
        participant: {
          id: otherUser.id,
          displayName: this.toDisplayName(otherUser.fullName, otherUser.email),
          avatarUrl: otherUser.avatarUrl,
        },
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
            }
          : null,
      };
    });
  }

  async createThread(userId: string, dto: CreateThreadDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException('Cannot create chat with yourself.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found.');
    }

    const [userAId, userBId] = this.normalizePair(userId, dto.targetUserId);

    const thread = await this.prisma.directChatThread.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: { updatedAt: new Date() },
      create: { userAId, userBId },
    });

    return { id: thread.id };
  }

  async listMessages(userId: string, threadId: string, query: ListMessagesQueryDto) {
    await this.ensureParticipant(userId, threadId);
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const items = await this.prisma.directChatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
      },
    });
    const total = await this.prisma.directChatMessage.count({ where: { threadId } });
    return { items, total };
  }

  async createMessage(userId: string, threadId: string, dto: CreateMessageDto) {
    await this.ensureParticipant(userId, threadId);
    const message = await this.prisma.directChatMessage.create({
      data: {
        threadId,
        senderId: userId,
        content: dto.content.trim(),
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
      },
    });
    await this.prisma.directChatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });
    return message;
  }
}
