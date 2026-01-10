/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;

    const jwtMock = {
      signAsync: jest.fn(),
    } as unknown as JwtService;

    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'REFRESH_TTL') {
          return 3600;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    (prismaMock.$transaction as jest.Mock).mockImplementation(
      async (callback: (client: PrismaService) => Promise<unknown>) => callback(prismaMock),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    prismaService = moduleRef.get(PrismaService);
    jwtService = moduleRef.get(JwtService);
  });

  it('registers a user and issues tokens', async () => {
    const now = new Date();

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prismaService.user.create as jest.Mock).mockImplementation(
      ({ data }: { data: { email: string; role: UserRole; passwordHash: string } }) => ({
        id: 'user-1',
        email: data.email,
        role: data.role,
        passwordHash: data.passwordHash,
        createdAt: now,
        updatedAt: now,
      }),
    );
    (prismaService.session.create as jest.Mock).mockResolvedValue({ id: 'session-1' });
    (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'refresh-1' });
    (jwtService.signAsync as jest.Mock).mockResolvedValue('access-token');

    const response = await authService.register(
      { email: 'USER@Email.com', password: 'password123' },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(response.user.email).toBe('user@email.com');
    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBeDefined();

    const createCall = (prismaService.user.create as jest.Mock).mock.calls[0] as [
      { data: { passwordHash: string } },
    ];
    const hashedPassword = createCall[0].data.passwordHash;
    expect(hashedPassword).not.toBe('password123');
    expect(await bcrypt.compare('password123', hashedPassword)).toBe(true);
  });

  it('rejects invalid login attempts', async () => {
    const passwordHash = await bcrypt.hash('correct-pass', 12);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@email.com',
      passwordHash,
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.login(
        { email: 'user@email.com', password: 'wrong-pass' },
        { ip: '127.0.0.1', userAgent: 'jest' },
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rotates refresh tokens', async () => {
    const now = new Date();
    const user = {
      id: 'user-1',
      email: 'user@email.com',
      role: UserRole.USER,
      passwordHash: 'hash',
      createdAt: now,
      updatedAt: now,
    };

    (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'refresh-1',
      userId: user.id,
      sessionId: 'session-1',
      tokenHash: 'hash',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      revokedAt: null,
      user,
      session: {
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });
    (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prismaService.refreshToken.create as jest.Mock).mockResolvedValue({ id: 'refresh-2' });
    (jwtService.signAsync as jest.Mock).mockResolvedValue('access-token');

    const response = await authService.refresh({ refreshToken: 'refresh-token' });

    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBeDefined();
    const refreshTokenUpdateMany = prismaService.refreshToken.updateMany as jest.Mock;
    expect(refreshTokenUpdateMany).toHaveBeenCalled();
  });

  it('rejects refresh when token is revoked', async () => {
    const now = new Date();
    (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      sessionId: 'session-1',
      tokenHash: 'hash',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      revokedAt: now,
      user: {
        id: 'user-1',
        email: 'user@email.com',
        role: UserRole.USER,
        passwordHash: 'hash',
        createdAt: now,
        updatedAt: now,
      },
      session: {
        id: 'session-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    await expect(authService.refresh({ refreshToken: 'refresh-token' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects refresh when session is revoked', async () => {
    const now = new Date();
    (prismaService.refreshToken.findUnique as jest.Mock).mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      sessionId: 'session-1',
      tokenHash: 'hash',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      revokedAt: null,
      user: {
        id: 'user-1',
        email: 'user@email.com',
        role: UserRole.USER,
        passwordHash: 'hash',
        createdAt: now,
        updatedAt: now,
      },
      session: {
        id: 'session-1',
        revokedAt: now,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    await expect(authService.refresh({ refreshToken: 'refresh-token' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('changes password and revokes sessions', async () => {
    const passwordHash = await bcrypt.hash('current-pass', 12);
    const user = {
      id: 'user-1',
      email: 'user@email.com',
      role: UserRole.USER,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);
    (prismaService.user.update as jest.Mock).mockImplementation(
      ({ data }: { data: { passwordHash: string } }) => ({
        ...user,
        passwordHash: data.passwordHash,
      }),
    );
    (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prismaService.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    await authService.changePassword('user-1', {
      currentPassword: 'current-pass',
      newPassword: 'new-pass-123',
    });

    const updateCall = (prismaService.user.update as jest.Mock).mock.calls[0] as [
      { data: { passwordHash: string } },
    ];
    const hashedPassword = updateCall[0].data.passwordHash;
    expect(hashedPassword).not.toBe('new-pass-123');
    expect(await bcrypt.compare('new-pass-123', hashedPassword)).toBe(true);
    const refreshTokenUpdateMany = prismaService.refreshToken.updateMany as jest.Mock;
    const revokedAtMatcher = expect.any(Date) as unknown as Date;
    expect(refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: revokedAtMatcher },
    });
    const sessionUpdateMany = prismaService.session.updateMany as jest.Mock;
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: revokedAtMatcher },
    });
  });

  it('rejects invalid current password on change', async () => {
    const passwordHash = await bcrypt.hash('current-pass', 12);
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'user@email.com',
      role: UserRole.USER,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.changePassword('user-1', {
        currentPassword: 'wrong-pass',
        newPassword: 'new-pass-123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists sessions and marks current', async () => {
    const now = new Date();
    (prismaService.session.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'session-1',
        createdAt: now,
        updatedAt: now,
        ip: '127.0.0.1',
        userAgent: 'jest',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: null,
      },
      {
        id: 'session-2',
        createdAt: now,
        updatedAt: now,
        ip: '127.0.0.2',
        userAgent: 'jest',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: null,
      },
    ]);

    const sessions = await authService.listSessions('user-1', 'session-2');

    expect(sessions).toHaveLength(2);
    expect(sessions.find((session) => session.id === 'session-2')?.isCurrent).toBe(true);
  });

  it('revokes session only for the owner', async () => {
    (prismaService.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      revokedAt: null,
    });
    (prismaService.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prismaService.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    await authService.revokeSession('session-1', { id: 'user-1', role: UserRole.USER });

    const sessionUpdateMany = prismaService.session.updateMany as jest.Mock;
    const revokedAtMatcher = expect.any(Date) as unknown as Date;
    expect(sessionUpdateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', revokedAt: null },
      data: { revokedAt: revokedAtMatcher },
    });
    const refreshTokenUpdateMany = prismaService.refreshToken.updateMany as jest.Mock;
    expect(refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { sessionId: 'session-1', revokedAt: null },
      data: { revokedAt: revokedAtMatcher },
    });
  });

  it('rejects revocation for other users', async () => {
    (prismaService.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      revokedAt: null,
    });

    await expect(
      authService.revokeSession('session-1', { id: 'user-2', role: UserRole.USER }),
    ).rejects.toThrow(ForbiddenException);
  });
});
