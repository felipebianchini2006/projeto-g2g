import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import type { AuthRequestMeta } from './auth.types';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const AUTH_THROTTLE = { auth: { ttl: 60, limit: 5 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.getRequestMeta(request));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
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

  private getRequestMeta(request: Request): AuthRequestMeta {
    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    return {
      ip: request.ip,
      userAgent,
    };
  }
}
