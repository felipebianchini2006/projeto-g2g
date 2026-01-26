import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { EmailQueueService } from '../email/email.service';
import {
  BCRYPT_SALT_ROUNDS,
  MFA_CODE_TTL_SECONDS,
  MFA_MAX_ATTEMPTS,
  MFA_REVERIFY_DAYS,
  PASSWORD_RESET_TTL_SECONDS,
} from './auth.constants';
import type { AuthRequestMeta, AuthResponse, AuthUser, MfaRequiredResponse } from './auth.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
    private readonly emailQueue: EmailQueueService,
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

  async login(dto: LoginDto, meta: AuthRequestMeta): Promise<AuthResponse | MfaRequiredResponse> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (this.isUserBlocked(user)) {
      throw new ForbiddenException('User is blocked.');
    }

    if (user.mfaEnabled && this.requiresMfa(user, meta)) {
      const challenge = await this.createMfaChallenge(user, meta);
      return { mfaRequired: true, challengeId: challenge.id };
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

    if (this.isUserBlocked(existing.user)) {
      throw new ForbiddenException('User is blocked.');
    }

    const sessionExpiryCap =
      existing.user.mfaEnabled && existing.session?.expiresAt ? existing.session.expiresAt : undefined;
    const rotated = await this.rotateRefreshToken(
      {
        userId: existing.userId,
        sessionId: existing.sessionId,
      },
      existing.id,
      sessionExpiryCap,
    );

    const accessToken = await this.signAccessToken(existing.user, existing.sessionId);
    return {
      user: this.buildAuthUser(existing.user),
      accessToken,
      refreshToken: rotated.refreshToken,
    };
  }

  private isUserBlocked(user: Pick<User, 'blockedAt' | 'blockedUntil'>) {
    return Boolean(user.blockedAt && (!user.blockedUntil || user.blockedUntil > new Date()));
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

    const response: { success: true; resetToken?: string } = { success: true };
    if (!user) {
      return response;
    }

    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000);

    await this.prismaService.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/conta/recuperar?token=${resetToken}`;
    const outbox = await this.prismaService.emailOutbox.create({
      data: {
        to: user.email,
        subject: 'Recuperação de senha',
        body: `Use o link para recuperar sua senha: ${resetLink}`,
      },
    });
    await this.emailQueue.enqueueEmail(outbox.id);

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

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: true }> {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const validPassword = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new BadRequestException('Current password is invalid.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    const now = new Date();

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    return { success: true };
  }

  async listSessions(userId: string, currentSessionId?: string | null) {
    const sessions = await this.prismaService.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        ip: true,
        userAgent: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      ip: session.ip,
      userAgent: session.userAgent,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      lastSeenAt: session.updatedAt,
      isCurrent: currentSessionId ? session.id === currentSessionId : false,
    }));
  }

  async revokeSession(
    sessionId: string,
    actor: { id: string; role: UserRole },
  ): Promise<{ success: true }> {
    const session = await this.prismaService.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    if (actor.role !== UserRole.ADMIN && session.userId !== actor.id) {
      throw new ForbiddenException('Session access denied.');
    }

    const now = new Date();
    await this.prismaService.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    return { success: true };
  }

  async logoutAllSessions(
    userId: string,
    currentSessionId?: string | null,
  ): Promise<{ success: true; revokedSessions: number; revokedTokens: number }> {
    const now = new Date();
    const sessionsWhere = currentSessionId
      ? { userId, revokedAt: null, NOT: { id: currentSessionId } }
      : { userId, revokedAt: null };
    const tokensWhere = currentSessionId
      ? { userId, revokedAt: null, sessionId: { not: currentSessionId } }
      : { userId, revokedAt: null };

    const result = await this.prismaService.$transaction(async (tx) => {
      const sessionsUpdated = await tx.session.updateMany({
        where: sessionsWhere,
        data: { revokedAt: now },
      });

      const tokensUpdated = await tx.refreshToken.updateMany({
        where: tokensWhere,
        data: { revokedAt: now },
      });

      return {
        revokedSessions: sessionsUpdated.count,
        revokedTokens: tokensUpdated.count,
      };
    });

    return { success: true, ...result };
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
      adminPermissions: user.adminPermissions ?? [],
      avatarUrl: user.avatarUrl ?? null,
      mfaEnabled: user.mfaEnabled ?? false,
      mfaLastVerifiedAt: user.mfaLastVerifiedAt ?? null,
      mfaLastVerifiedIp: user.mfaLastVerifiedIp ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async issueTokensForUser(user: User, meta: AuthRequestMeta): Promise<AuthResponse> {
    return this.issueTokens(user, meta);
  }

  private async issueTokens(user: User, meta: AuthRequestMeta): Promise<AuthResponse> {
    const expiresAt = this.computeSessionExpiresAt(user);
    const { refreshToken, refreshTokenHash } = this.generateRefreshToken();
    let sessionId: string | null = null;

    await this.prismaService.$transaction(async (tx) => {
      const session = await tx.session.create({
        data: {
          userId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
          expiresAt,
        },
      });
      sessionId = session.id;

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          sessionId: session.id,
          tokenHash: refreshTokenHash,
          expiresAt,
        },
      });
    });

    const accessToken = await this.signAccessToken(user, sessionId);
    return {
      user: this.buildAuthUser(user),
      accessToken,
      refreshToken,
    };
  }

  private async rotateRefreshToken(
    payload: RefreshRotationPayload,
    tokenId: string,
    sessionExpiresAtCap?: Date,
  ): Promise<{ refreshToken: string }> {
    const refreshTtlSeconds = this.getRefreshTtlSeconds();
    let expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);
    if (sessionExpiresAtCap && sessionExpiresAtCap < expiresAt) {
      expiresAt = sessionExpiresAtCap;
    }
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
        const sessionExpiresAt =
          sessionExpiresAtCap && sessionExpiresAtCap < expiresAt ? sessionExpiresAtCap : expiresAt;
        await tx.session.updateMany({
          where: { id: payload.sessionId, revokedAt: null },
          data: { expiresAt: sessionExpiresAt },
        });
      }
    });

    return { refreshToken };
  }

  private async signAccessToken(user: User, sessionId?: string | null): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
      sessionId: sessionId ?? undefined,
    });
  }

  private getRefreshTtlSeconds() {
    return this.configService.get<number>('REFRESH_TTL') ?? 2592000;
  }

  private generateRefreshToken(): { refreshToken: string; refreshTokenHash: string } {
    const refreshToken = randomBytes(48).toString('hex');
    return { refreshToken, refreshTokenHash: this.hashToken(refreshToken) };
  }

  private computeSessionExpiresAt(user: User) {
    const refreshTtlSeconds = this.getRefreshTtlSeconds();
    const refreshExpiry = new Date(Date.now() + refreshTtlSeconds * 1000);
    if (!user.mfaEnabled) {
      return refreshExpiry;
    }
    const mfaExpiry = new Date(Date.now() + MFA_REVERIFY_DAYS * 24 * 60 * 60 * 1000);
    return mfaExpiry < refreshExpiry ? mfaExpiry : refreshExpiry;
  }

  private requiresMfa(user: User, meta: AuthRequestMeta) {
    const now = Date.now();
    const lastVerifiedAt = user.mfaLastVerifiedAt?.getTime();
    const stale =
      !lastVerifiedAt ||
      now - lastVerifiedAt > MFA_REVERIFY_DAYS * 24 * 60 * 60 * 1000;
    const ipChanged =
      !meta.ip || !user.mfaLastVerifiedIp || meta.ip !== user.mfaLastVerifiedIp;
    return stale || ipChanged;
  }

  private hashCode(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private generateMfaCode() {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private async createMfaChallenge(user: User, meta: AuthRequestMeta) {
    const code = this.generateMfaCode();
    const expiresAt = new Date(Date.now() + MFA_CODE_TTL_SECONDS * 1000);

    const challenge = await this.prismaService.mfaChallenge.create({
      data: {
        userId: user.id,
        email: user.email,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        codeHash: this.hashCode(code),
        expiresAt,
      },
    });

    const subject = 'Seu codigo de verificacao';
    const ipInfo = meta.ip ? `IP: ${meta.ip}` : 'IP desconhecido';
    const body = `Seu codigo para confirmar o acesso e: ${code}\n\n${ipInfo}\nEste codigo expira em 10 minutos.`;
    const outbox = await this.prismaService.emailOutbox.create({
      data: { to: user.email, subject, body },
    });
    await this.emailQueue.enqueueEmail(outbox.id);

    return challenge;
  }

  async requestMfaEnable(userId: string, meta: AuthRequestMeta): Promise<{ challengeId: string }> {
    const user = await this.prismaService.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA already enabled.');
    }

    const challenge = await this.createMfaChallenge(user, meta);
    return { challengeId: challenge.id };
  }

  async confirmMfaEnable(
    userId: string,
    code: string,
    challengeId: string,
    meta: AuthRequestMeta,
  ): Promise<{ success: true }> {
    const challenge = await this.prismaService.mfaChallenge.findUnique({
      where: { id: challengeId },
    });
    const now = new Date();

    if (!challenge || challenge.userId !== userId) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    await this.ensureChallengeValid(challenge, code, now);

    await this.prismaService.$transaction(async (tx) => {
      await tx.mfaChallenge.updateMany({
        where: { id: challengeId, usedAt: null },
        data: { usedAt: now },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaLastVerifiedAt: now,
          mfaLastVerifiedIp: meta.ip ?? null,
        },
      });
    });

    return { success: true };
  }

  async verifyMfaLogin(
    challengeId: string,
    code: string,
    meta: AuthRequestMeta,
  ): Promise<AuthResponse> {
    const challenge = await this.prismaService.mfaChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });
    const now = new Date();

    if (!challenge || !challenge.user) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    await this.ensureChallengeValid(challenge, code, now);

    let user = challenge.user;
    await this.prismaService.$transaction(async (tx) => {
      const updatedChallenge = await tx.mfaChallenge.updateMany({
        where: { id: challengeId, usedAt: null },
        data: { usedAt: now },
      });
      if (updatedChallenge.count === 0) {
        throw new BadRequestException('Verification code already used.');
      }
      user = await tx.user.update({
        where: { id: challenge.userId },
        data: {
          mfaLastVerifiedAt: now,
          mfaLastVerifiedIp: meta.ip ?? null,
        },
      });
    });

    return this.issueTokens(user, meta);
  }

  private async ensureChallengeValid(
    challenge: { id: string; codeHash: string; attempts: number; expiresAt: Date; usedAt: Date | null },
    code: string,
    now: Date,
  ) {
    if (challenge.usedAt || challenge.expiresAt <= now) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    if (challenge.attempts >= MFA_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    const codeHash = this.hashCode(code);
    if (codeHash !== challenge.codeHash) {
      const reachedLimit = challenge.attempts + 1 >= MFA_MAX_ATTEMPTS;
      await this.prismaService.mfaChallenge.updateMany({
        where: { id: challenge.id, usedAt: null },
        data: { attempts: { increment: 1 }, ...(reachedLimit ? { usedAt: now } : {}) },
      });
      throw new BadRequestException('Invalid verification code.');
    }
  }
}
