/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OAuthProvider, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { DiscordAccountService } from './discord-account.service';

describe('DiscordAccountService', () => {
  let accountService: DiscordAccountService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const prismaMock = {
      oAuthAccount: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (callback: (client: PrismaService) => Promise<unknown>) => callback(prismaMock),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscordAccountService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    accountService = moduleRef.get(DiscordAccountService);
    prismaService = moduleRef.get(PrismaService);
  });

  it('reuses existing discord account', async () => {
    const user = {
      id: 'user-1',
      email: 'user@email.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaService.oAuthAccount.findUnique as jest.Mock).mockResolvedValue({
      id: 'oa-1',
      user,
    });
    (prismaService.oAuthAccount.update as jest.Mock).mockResolvedValue({ id: 'oa-1' });

    const result = await accountService.findOrCreateUser(
      { id: 'discord-1', email: 'user@email.com', username: 'user', avatar: null },
      { accessToken: 'token-1', refreshToken: 'token-2' },
    );

    expect(result).toEqual(user);
    expect(prismaService.oAuthAccount.update).toHaveBeenCalledWith({
      where: { id: 'oa-1' },
      data: { accessToken: 'token-1', refreshToken: 'token-2' },
    });
  });

  it('links discord account to existing email', async () => {
    const user = {
      id: 'user-1',
      email: 'user@email.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaService.oAuthAccount.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
    (prismaService.oAuthAccount.create as jest.Mock).mockResolvedValue({ id: 'oa-1' });

    const result = await accountService.findOrCreateUser(
      { id: 'discord-1', email: 'USER@email.com', username: 'user', avatar: null },
      { accessToken: 'token-1' },
    );

    expect(result).toEqual(user);
    expect(prismaService.oAuthAccount.create).toHaveBeenCalledWith({
      data: {
        provider: OAuthProvider.DISCORD,
        providerUserId: 'discord-1',
        userId: 'user-1',
        accessToken: 'token-1',
        refreshToken: null,
      },
    });
  });

  it('creates a new user when no email match exists', async () => {
    (prismaService.oAuthAccount.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaService.user.create as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@email.com',
      passwordHash: 'hash',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (prismaService.oAuthAccount.create as jest.Mock).mockResolvedValue({ id: 'oa-1' });

    const result = await accountService.findOrCreateUser(
      { id: 'discord-1', email: 'user@email.com', username: 'user', avatar: null },
      { accessToken: 'token-1' },
    );

    expect(result.email).toBe('user@email.com');
    expect(prismaService.user.create).toHaveBeenCalled();
    expect(prismaService.oAuthAccount.create).toHaveBeenCalledWith({
      data: {
        provider: OAuthProvider.DISCORD,
        providerUserId: 'discord-1',
        userId: 'user-1',
        accessToken: 'token-1',
        refreshToken: null,
      },
    });
  });

  it('rejects profiles without email for new accounts', async () => {
    (prismaService.oAuthAccount.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      accountService.findOrCreateUser(
        { id: 'discord-1', email: null, username: 'user', avatar: null },
        { accessToken: 'token-1' },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
