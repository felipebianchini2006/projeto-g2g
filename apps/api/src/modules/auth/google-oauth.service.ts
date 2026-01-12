import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
};

type GoogleAccessTokens = {
  accessToken: string;
  refreshToken?: string | null;
  idToken?: string | null;
};

type GoogleProfile = {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const DEFAULT_TIMEOUT_MS = 8000;

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly configService: ConfigService) {}

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<GoogleAccessTokens> {
    if (!code?.trim()) {
      throw new BadRequestException('Missing authorization code.');
    }

    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET');

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const response = await this.fetchWithTimeout(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const payload = (await this.parseJson(response)) as GoogleTokenResponse | null;
    if (!response.ok) {
      const message = this.extractError(payload, 'Google token exchange failed.');
      throw new UnauthorizedException(message);
    }

    const accessToken = payload?.access_token;
    if (!accessToken) {
      throw new BadRequestException('Google token response missing access token.');
    }

    return {
      accessToken,
      refreshToken: payload?.refresh_token ?? null,
      idToken: payload?.id_token ?? null,
    };
  }

  async fetchGoogleUser(accessToken: string): Promise<GoogleProfile> {
    if (!accessToken?.trim()) {
      throw new BadRequestException('Missing Google access token.');
    }

    const response = await this.fetchWithTimeout(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const payload = (await this.parseJson(response)) as GoogleUserResponse | null;
    if (!response.ok) {
      const message = this.extractError(payload, 'Google user lookup failed.');
      throw new UnauthorizedException(message);
    }

    if (!payload?.sub || !payload.email) {
      throw new BadRequestException('Google profile response invalid.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified ?? false,
      name: payload.name,
      picture: payload.picture,
    };
  }

  private async fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('Google request timed out.');
      }
      throw new ServiceUnavailableException('Google request failed.');
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

  private extractError(payload: GoogleTokenResponse | GoogleUserResponse | null, fallback: string) {
    if (payload && typeof payload === 'object') {
      if ('error' in payload && payload.error) {
        const description =
          'error_description' in payload && payload.error_description
            ? ` (${payload.error_description})`
            : '';
        return `Google error: ${String(payload.error)}${description}`;
      }
    }
    return fallback;
  }
}

export type { GoogleAccessTokens, GoogleProfile };
