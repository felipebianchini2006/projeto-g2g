import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_SALT_ROUNDS, PASSWORD_RESET_TTL_SECONDS } from './auth.constants';
import type { AuthRequestMeta, AuthResponse, AuthUser } from './auth.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type RefreshRotationPayload = {
  userId: string;
  sessionId?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, meta: AuthRequestMeta): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const role = dto.role ?? UserRole.USER;

    if (role !== UserRole.USER && role !== UserRole.SELLER) {
      throw new BadRequestException('Role not allowed for self-registration.');
    }

    const existing = await this.prismaService.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.prismaService.user.create({
      data: { email, passwordHash, role },
    });

    return this.issueTokens(user, meta);
  }

  async login(dto: LoginDto, meta: AuthRequestMeta): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.blockedAt) {
      throw new ForbiddenException('User is blocked.');
    }

    return this.issueTokens(user, meta);
  }

  async refresh(dto: RefreshDto): Promise<AuthResponse> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const now = new Date();

    const existing = await this.prismaService.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true, session: true },
    });

    if (!existing || !existing.user) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (existing.revokedAt || existing.expiresAt <= now) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (existing.sessionId && !existing.session) {
      throw new UnauthorizedException('Session expired.');
    }

    if (
      existing.session?.revokedAt ||
      (existing.session?.expiresAt && existing.session.expiresAt <= now)
    ) {
      throw new UnauthorizedException('Session expired.');
    }

    if (existing.user.blockedAt) {
      throw new ForbiddenException('User is blocked.');
    }

    const rotated = await this.rotateRefreshToken(
      {
        userId: existing.userId,
        sessionId: existing.sessionId,
      },
      existing.id,
    );

    const accessToken = await this.signAccessToken(existing.user);
    return {
      user: this.buildAuthUser(existing.user),
      accessToken,
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(dto: LogoutDto): Promise<{ success: true }> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const existing = await this.prismaService.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing) {
      return { success: true };
    }

    const now = new Date();
    await this.prismaService.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: now },
      });

      if (existing.sessionId) {
        await tx.session.updateMany({
          where: { id: existing.sessionId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
    });

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ success: true; resetToken?: string }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user) {
      return { success: true };
    }

    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000);

    await this.prismaService.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const response: { success: true; resetToken?: string } = { success: true };
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      response.resetToken = resetToken;
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    const tokenHash = this.hashToken(dto.token);
    const now = new Date();

    const existing = await this.prismaService.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing || !existing.user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    if (existing.usedAt || existing.expiresAt <= now) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.passwordResetToken.updateMany({
        where: { id: existing.id, usedAt: null },
        data: { usedAt: now },
      });

      if (updated.count === 0) {
        throw new BadRequestException('Reset token already used.');
      }

      await tx.user.update({
        where: { id: existing.userId },
        data: { passwordHash },
      });

      await tx.refreshToken.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.session.updateMany({
        where: { userId: existing.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    return { success: true };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private hashToken(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private buildAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async issueTokens(user: User, meta: AuthRequestMeta): Promise<AuthResponse> {
    const refreshTtlSeconds = this.getRefreshTtlSeconds();
    const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
    const { refreshToken, refreshTokenHash } = this.generateRefreshToken();

    await this.prismaService.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          userId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
          expiresAt,
        },
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          tokenHash: refreshTokenHash,
          expiresAt,
        },
      });
    });

    const accessToken = await this.signAccessToken(user);
    return {
      user: this.buildAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  private async rotateRefreshToken(
    payload: RefreshRotationPayload,
    tokenId: string,
  ): Promise<{ refreshToken: string }> {
    const refreshTtlSeconds = this.getRefreshTtlSeconds();
    const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
    const { refreshToken, refreshTokenHash } = this.generateRefreshToken();
    const now = new Date();

    await this.prismaService.$transaction(async (tx) => {
      const updated = await tx.refreshToken.updateMany({
        where: { id: tokenId, revokedAt: null },
        data: { revokedAt: now },
      });

      if (updated.count === 0) {
        throw new UnauthorizedException('Refresh token already used.');
      }

      await tx.refreshToken.create({
        data: {
          userId: payload.userId,
          sessionId: payload.sessionId,
          tokenHash: refreshTokenHash,
          expiresAt,
        },
      });

      if (payload.sessionId) {
        await tx.session.updateMany({
          where: { id: payload.sessionId, revokedAt: null },
          data: { expiresAt },
        });
      }
    });

    return { refreshToken };
  }

  private async signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({ sub: user.id, role: user.role });
  }

  private getRefreshTtlSeconds() {
    return this.configService.get<number>('REFRESH_TTL') ?? 2592000;
  }

  private generateRefreshToken(): { refreshToken: string; refreshTokenHash: string } {
    const refreshToken = randomBytes(48).toString('hex');
    return { refreshToken, refreshTokenHash: this.hashToken(refreshToken) };
  }
}
