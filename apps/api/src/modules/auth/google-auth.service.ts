import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserRole } from '@prisma/client';

import type { AuthRequestMeta, AuthResponse } from './auth.types';
import { AuthService } from './auth.service';
import { GoogleAccountService } from './google-account.service';
import { GoogleOAuthService } from './google-oauth.service';

@Injectable()
export class GoogleAuthService {
  constructor(
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly googleAccountService: GoogleAccountService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async exchangeCodeForSession(
    code: string,
    redirectUri: string,
    meta: AuthRequestMeta,
    role?: UserRole,
  ): Promise<AuthResponse> {
    const expectedRedirect = this.configService.getOrThrow<string>('GOOGLE_REDIRECT_URI');
    if (redirectUri !== expectedRedirect) {
      throw new BadRequestException('Redirect URI mismatch.');
    }

    const tokens = await this.googleOAuthService.exchangeCodeForToken(code, redirectUri);
    const profile = await this.googleOAuthService.fetchGoogleUser(tokens.accessToken);
    const user = await this.googleAccountService.findOrCreateUser(profile, tokens, role);

    if (user.blockedAt && (!user.blockedUntil || user.blockedUntil > new Date())) {
      const reason = user.blockedReason?.trim();
      throw new ForbiddenException(
        reason ? `Usuário Bloqueado: ${reason}` : 'Usuário Bloqueado.',
      );
    }

    return this.authService.issueTokensForUser(user, meta);
  }
}
