import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthRequestMeta, AuthResponse } from './auth.types';
import { AuthService } from './auth.service';
import { DiscordAccountService } from './discord-account.service';
import { DiscordOAuthService } from './discord-oauth.service';

@Injectable()
export class DiscordAuthService {
  constructor(
    private readonly discordOAuthService: DiscordOAuthService,
    private readonly discordAccountService: DiscordAccountService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async exchangeCodeForSession(
    code: string,
    redirectUri: string,
    meta: AuthRequestMeta,
  ): Promise<AuthResponse> {
    const expectedRedirect = this.configService.getOrThrow<string>('DISCORD_REDIRECT_URI');
    if (redirectUri !== expectedRedirect) {
      throw new BadRequestException('Redirect URI mismatch.');
    }

    const tokens = await this.discordOAuthService.exchangeCodeForToken(code, redirectUri);
    const profile = await this.discordOAuthService.fetchDiscordUser(tokens.accessToken);
    const user = await this.discordAccountService.findOrCreateUser(profile, tokens);

    if (user.blockedAt && (!user.blockedUntil || user.blockedUntil > new Date())) {
      throw new ForbiddenException('User is blocked.');
    }

    return this.authService.issueTokensForUser(user, meta);
  }
}
