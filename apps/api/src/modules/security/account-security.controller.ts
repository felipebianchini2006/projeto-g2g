import { Body, Controller, HttpCode, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MfaVerifyDto } from '../auth/dto/mfa-verify.dto';

const MFA_THROTTLE = { mfa: { ttl: 60, limit: 5 } };

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('security')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class AccountSecurityController {
  constructor(private readonly authService: AuthService) {}

  @Post('mfa/enable-request')
  @Throttle(MFA_THROTTLE)
  @HttpCode(200)
  requestEnable(@Req() request: AuthenticatedRequest) {
    const userId = this.getUserId(request);
    return this.authService.requestMfaEnable(userId, this.getRequestMeta(request));
  }

  @Post('mfa/enable-confirm')
  @Throttle(MFA_THROTTLE)
  @HttpCode(200)
  confirmEnable(@Req() request: AuthenticatedRequest, @Body() dto: MfaVerifyDto) {
    const userId = this.getUserId(request);
    return this.authService.confirmMfaEnable(
      userId,
      dto.code,
      dto.challengeId,
      this.getRequestMeta(request),
    );
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }

  private getRequestMeta(request: Request) {
    const userAgentHeader = request.headers['user-agent'] as string | string[] | undefined;
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    return {
      ip: request.ip,
      userAgent,
    };
  }
}
