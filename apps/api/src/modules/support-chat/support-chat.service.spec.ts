/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SupportChatRole, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SupportChatService } from './support-chat.service';

describe('SupportChatService', () => {
  let service: SupportChatService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const prismaMock = {
      supportChatSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      supportChatMessage: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as PrismaService;

    const moduleRef = await Test.createTestingModule({
      providers: [SupportChatService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = moduleRef.get(SupportChatService);
    prismaService = moduleRef.get(PrismaService);
  });

  it('allows session owner access', async () => {
    (prismaService.supportChatSession.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
    });

    const session = await service.ensureSessionAccess('session-1', {
      id: 'user-1',
      role: UserRole.USER,
    });

    expect(session.id).toBe('session-1');
  });

  it('allows admin access', async () => {
    (prismaService.supportChatSession.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-1',
      userId: 'user-2',
    });

    const session = await service.ensureSessionAccess('session-1', {
      id: 'admin-1',
      role: UserRole.ADMIN,
    });

    expect(session.id).toBe('session-1');
  });

  it('rejects non-owner access', async () => {
    (prismaService.supportChatSession.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-1',
      userId: 'user-2',
    });

    await expect(
      service.ensureSessionAccess('session-1', {
        id: 'user-1',
        role: UserRole.USER,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects missing sessions', async () => {
    (prismaService.supportChatSession.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.ensureSessionAccess('session-1', {
        id: 'user-1',
        role: UserRole.USER,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('persists messages', async () => {
    const session = {
      id: 'session-1',
      userId: 'user-1',
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (prismaService.supportChatMessage.create as jest.Mock).mockResolvedValue({
      id: 'msg-1',
      sessionId: 'session-1',
      role: SupportChatRole.USER,
      content: 'Oi',
    });
    (prismaService.supportChatSession.update as jest.Mock).mockResolvedValue(session);

    const message = await service.createMessage(session, SupportChatRole.USER, 'Oi');

    expect(prismaService.supportChatMessage.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-1',
        role: SupportChatRole.USER,
        content: 'Oi',
      },
    });
    expect(message.id).toBe('msg-1');
  });
});
