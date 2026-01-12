import { BadRequestException, Injectable } from '@nestjs/common';
import { OAuthProvider, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_SALT_ROUNDS } from './auth.constants';
import type { GoogleAccessTokens, GoogleProfile } from './google-oauth.service';

const ALLOWED_ROLES = new Set<UserRole>([UserRole.USER, UserRole.SELLER]);

@Injectable()
export class GoogleAccountService {
  constructor(private readonly prismaService: PrismaService) {}

  async findOrCreateUser(
    profile: GoogleProfile,
    tokens: GoogleAccessTokens,
    role?: UserRole,
  ): Promise<User> {
    if (!profile.id) {
      throw new BadRequestException('Google profile missing id.');
    }

    const existingAccount = await this.prismaService.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: OAuthProvider.GOOGLE,
          providerUserId: profile.id,
        },
      },
      include: { user: true },
    });

    if (existingAccount?.user) {
      await this.prismaService.oAuthAccount.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        },
      });
      return existingAccount.user;
    }

    const email = profile.email?.trim().toLowerCase() ?? null;
    if (!email) {
      throw new BadRequestException('Google account has no email.');
    }

    const existingUser = await this.prismaService.user.findUnique({ where: { email } });
    if (existingUser) {
      await this.prismaService.oAuthAccount.create({
        data: {
          provider: OAuthProvider.GOOGLE,
          providerUserId: profile.id,
          userId: existingUser.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        },
      });
      return existingUser;
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_SALT_ROUNDS);
    const userRole = role && ALLOWED_ROLES.has(role) ? role : UserRole.USER;

    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, role: userRole },
      });
      await tx.oAuthAccount.create({
        data: {
          provider: OAuthProvider.GOOGLE,
          providerUserId: profile.id,
          userId: user.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        },
      });
      return user;
    });
  }
}
