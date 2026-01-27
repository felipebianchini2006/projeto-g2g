import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestPartnerPayoutDto } from './dto/request-partner-payout.dto';
import { PartnersService } from './partners.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('partner')
@UseGuards(JwtAuthGuard)
export class PartnerDashboardController {
  constructor(private readonly partnersService: PartnersService) { }

  @Get('me')
  listOwned(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.partnersService.listOwnedPartners(userId);
  }

  @Get('me/:partnerId/stats')
  stats(@Req() req: AuthenticatedRequest, @Param('partnerId') partnerId: string) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? UserRole.USER;
    return this.partnersService.getPartnerStatsForUser(partnerId, userId, role);
  }

  @Post('me/:partnerId/payouts/request')
  requestPayout(
    @Req() req: AuthenticatedRequest,
    @Param('partnerId') partnerId: string,
    @Body() dto: RequestPartnerPayoutDto,
  ) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? UserRole.USER;
    return this.partnersService.requestPartnerPayout(
      partnerId,
      userId,
      role,
      dto,
      this.getRequestMeta(req),
    );
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }
    return request.user.sub;
  }

  private getRequestMeta(request: Request) {
    return {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
