import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type DiscordTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type DiscordUserResponse = {
  id?: string;
  email?: string | null;
  username?: string;
  avatar?: string | null;
  message?: string;
};

type DiscordAccessTokens = {
  accessToken: string;
  refreshToken?: string | null;
};

type DiscordProfile = {
  id: string;
  email: string | null;
  username: string;
  avatar: string | null;
};

const DISCORD_API_BASE = 'https://discord.com/api';
const DEFAULT_TIMEOUT_MS = 8000;

@Injectable()
export class DiscordOAuthService {
  constructor(private readonly configService: ConfigService) {}

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<DiscordAccessTokens> {
    if (!code?.trim()) {
      throw new BadRequestException('Missing authorization code.');
    }

    const clientId = this.configService.getOrThrow<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>('DISCORD_CLIENT_SECRET');

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const response = await this.fetchWithTimeout(`${DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const payload = (await this.parseJson(response)) as DiscordTokenResponse | null;
    if (!response.ok) {
      const message = this.extractError(payload, 'Discord token exchange failed.');
      throw new UnauthorizedException(message);
    }

    const accessToken = payload?.access_token;
    if (!accessToken) {
      throw new BadRequestException('Discord token response missing access token.');
    }

    return {
      accessToken,
      refreshToken: payload?.refresh_token ?? null,
    };
  }

  async fetchDiscordUser(accessToken: string): Promise<DiscordProfile> {
    if (!accessToken?.trim()) {
      throw new BadRequestException('Missing Discord access token.');
    }

    const response = await this.fetchWithTimeout(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payload = (await this.parseJson(response)) as DiscordUserResponse | null;
    if (!response.ok) {
      const message = this.extractError(payload, 'Discord user lookup failed.');
      throw new UnauthorizedException(message);
    }

    if (!payload?.id || !payload.username) {
      throw new BadRequestException('Discord profile response invalid.');
    }

    return {
      id: payload.id,
      email: payload.email ?? null,
      username: payload.username,
      avatar: payload.avatar ?? null,
    };
  }

  private async fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('Discord request timed out.');
      }
      throw new ServiceUnavailableException('Discord request failed.');
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parseJson(response: Response) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return null;
  }

  private extractError(payload: DiscordTokenResponse | DiscordUserResponse | null, fallback: string) {
    if (payload && typeof payload === 'object') {
      if ('error' in payload && payload.error) {
        const description =
          'error_description' in payload && payload.error_description
            ? ` (${payload.error_description})`
            : '';
        return `Discord error: ${String(payload.error)}${description}`;
      }
      if ('message' in payload && payload.message) {
        return `Discord error: ${String(payload.message)}`;
      }
    }
    return fallback;
  }
}

export type { DiscordAccessTokens, DiscordProfile };
