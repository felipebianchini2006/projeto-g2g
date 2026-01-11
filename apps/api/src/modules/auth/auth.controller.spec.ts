import { ForbiddenException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordAuthService } from './discord-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController (discord exchange)', () => {
  let app: INestApplication;
  const authService = {};
  const discordAuthService = {
    exchangeCodeForSession: jest.fn(),
  };

  beforeAll(async () => {
    const allowGuard = { canActivate: () => true };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DiscordAuthService, useValue: discordAuthService },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue(allowGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates body payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/discord/exchange')
      .send({ redirectUri: 'http://localhost:3000/api/auth/discord/callback' })
      .expect(400);
  });

  it('returns 401 when token exchange fails', async () => {
    discordAuthService.exchangeCodeForSession.mockRejectedValue(
      new UnauthorizedException('Invalid code.'),
    );

    await request(app.getHttpServer())
      .post('/auth/discord/exchange')
      .send({
        code: 'invalid',
        redirectUri: 'http://localhost:3000/api/auth/discord/callback',
      })
      .expect(401);
  });

  it('returns 403 when user is blocked', async () => {
    discordAuthService.exchangeCodeForSession.mockRejectedValue(
      new ForbiddenException('User is blocked.'),
    );

    await request(app.getHttpServer())
      .post('/auth/discord/exchange')
      .send({
        code: 'valid',
        redirectUri: 'http://localhost:3000/api/auth/discord/callback',
      })
      .expect(403);
  });
});
