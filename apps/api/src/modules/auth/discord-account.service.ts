import { BadRequestException, Injectable } from '@nestjs/common';
import { OAuthProvider, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_SALT_ROUNDS } from './auth.constants';
import type { DiscordAccessTokens, DiscordProfile } from './discord-oauth.service';

@Injectable()
export class DiscordAccountService {
  constructor(private readonly prismaService: PrismaService) {}

  async findOrCreateUser(profile: DiscordProfile, tokens: DiscordAccessTokens): Promise<User> {
    if (!profile.id) {
      throw new BadRequestException('Discord profile missing id.');
    }

    const existingAccount = await this.prismaService.oauthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: OAuthProvider.DISCORD,
          providerUserId: profile.id,
        },
      },
      include: { user: true },
    });

    if (existingAccount?.user) {
      await this.prismaService.oauthAccount.update({
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
      throw new BadRequestException('Discord account has no email.');
    }

    const existingUser = await this.prismaService.user.findUnique({ where: { email } });
    if (existingUser) {
      await this.prismaService.oauthAccount.create({
        data: {
          provider: OAuthProvider.DISCORD,
          providerUserId: profile.id,
          userId: existingUser.id,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
        },
      });
      return existingUser;
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_SALT_ROUNDS);
    return this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, passwordHash, role: UserRole.USER },
      });
      await tx.oauthAccount.create({
        data: {
          provider: OAuthProvider.DISCORD,
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
