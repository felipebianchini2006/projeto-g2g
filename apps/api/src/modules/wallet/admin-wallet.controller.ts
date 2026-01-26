import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { WalletService } from './wallet.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/wallet')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.wallet')
export class AdminWalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('summary')
  getSummary() {
    return this.walletService.getAdminSummary();
  }

  @Post('payouts')
  createPayout(@Req() req: AuthenticatedRequest, @Body() dto: CreatePayoutDto) {
    const adminId = this.getUserId(req);
    return this.walletService.createPlatformPayout(adminId, dto);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
