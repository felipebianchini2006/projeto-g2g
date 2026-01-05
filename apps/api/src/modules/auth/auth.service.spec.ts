import { UnauthorizedException } from '@nestjs/common';
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
    (prismaService.user.create as jest.Mock).mockImplementation(({ data }) => ({
      id: 'user-1',
      email: data.email,
      role: data.role,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    }));
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

    const createArgs = (prismaService.user.create as jest.Mock).mock.calls[0][0];
    const hashedPassword = createArgs.data.passwordHash as string;
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
    expect(prismaService.refreshToken.updateMany).toHaveBeenCalled();
  });
});
