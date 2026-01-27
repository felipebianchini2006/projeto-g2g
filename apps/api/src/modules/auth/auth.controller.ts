import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import type { AuthRequestMeta, JwtPayload } from './auth.types';
import { AuthService } from './auth.service';
import { DiscordAuthService } from './discord-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DiscordExchangeDto } from './dto/discord-exchange.dto';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthService } from './google-auth.service';

const AUTH_THROTTLE = { auth: { ttl: 60, limit: 5 } };
type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly discordAuthService: DiscordAuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) { }

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, this.getRequestMeta(request));
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto, this.getRequestMeta(request));
    if ('mfaRequired' in result && result.mfaRequired) {
      response.status(202);
    }
    return result;
  }

  @Post('discord/exchange')
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  exchangeDiscord(@Body() dto: DiscordExchangeDto, @Req() request: Request) {
    return this.discordAuthService.exchangeCodeForSession(
      dto.code,
      dto.redirectUri,
      this.getRequestMeta(request),
    );
  }

  @Post('google/exchange')
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  exchangeGoogle(@Body() dto: GoogleExchangeDto, @Req() request: Request) {
    return this.googleAuthService.exchangeCodeForSession(
      dto.code,
      dto.redirectUri,
      this.getRequestMeta(request),
      dto.role,
    );
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @Post('mfa/verify')
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  verifyMfa(@Body() dto: MfaVerifyDto, @Req() request: Request) {
    return this.authService.verifyMfaLogin(dto.challengeId, dto.code, this.getRequestMeta(request));
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  changePassword(@Req() request: AuthenticatedRequest, @Body() dto: ChangePasswordDto) {
    const userId = this.getUserId(request);
    return this.authService.changePassword(userId, dto);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  listSessions(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);
    return this.authService.listSessions(userId, request.user?.sessionId);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  revokeSession(@Req() request: AuthenticatedRequest, @Param('id') sessionId: string) {
    const actor = this.getUserInfo(request);
    return this.authService.revokeSession(sessionId, actor);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  logoutAll(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);
    return this.authService.logoutAllSessions(userId, request.user?.sessionId);
  }

  private getRequestMeta(request: Request): AuthRequestMeta {
    const userAgentHeader = request.headers['user-agent'] as string | string[] | undefined;
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    return {
      ip: request.ip,
      userAgent,
    };
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }
    return request.user.sub;
  }

  private getUserInfo(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }
    return { id: request.user.sub, role: request.user.role };
  }
}
