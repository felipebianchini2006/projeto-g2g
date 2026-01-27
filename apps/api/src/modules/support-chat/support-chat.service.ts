import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupportChatRole, SupportChatSession, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupportChatService {
  constructor(private readonly prismaService: PrismaService) { }

  createSession(userId: string) {
    return this.prismaService.supportChatSession.create({
      data: { userId },
    });
  }

  async ensureSessionAccess(sessionId: string, user: { id: string; role: UserRole }) {
    const session = await this.prismaService.supportChatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sessão de chat de suporte não encontrada.');
    }

    if (user.role === UserRole.ADMIN) {
      return session;
    }

    if (!session.userId || session.userId !== user.id) {
      throw new ForbiddenException('Acesso ao chat de suporte negado.');
    }

    return session;
  }

  listMessages(sessionId: string) {
    return this.prismaService.supportChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  listRecentMessages(sessionId: string, take: number) {
    return this.prismaService.supportChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async createMessage(session: SupportChatSession, role: SupportChatRole, content: string) {
    const message = await this.prismaService.supportChatMessage.create({
      data: {
        sessionId: session.id,
        role,
        content,
      },
    });

    await this.prismaService.supportChatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}
