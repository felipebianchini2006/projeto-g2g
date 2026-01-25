import { Controller, Get, Post, Body, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WalletEntriesQueryDto } from './dto/wallet-entries-query.dto';
import { PayOrderWithWalletDto } from './dto/pay-order-with-wallet.dto';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { WalletService } from './wallet.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.SELLER, UserRole.ADMIN)
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get('summary')
  getSummary(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.walletService.getSummary(userId);
  }

  @Get('entries')
  listEntries(@Req() req: AuthenticatedRequest, @Query() query: WalletEntriesQueryDto) {
    const userId = this.getUserId(req);
    return this.walletService.listEntries(userId, query);
  }

  @Post('topup/pix')
  topupPix(@Req() req: AuthenticatedRequest, @Body() dto: TopupWalletDto) {
    const userId = this.getUserId(req);
    return this.walletService.createTopupPix(userId, dto);
  }

  @Post('payouts')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  createPayout(@Req() req: AuthenticatedRequest, @Body() dto: CreatePayoutDto) {
    const userId = this.getUserId(req);
    return this.walletService.createUserPayout(userId, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('pay-order')
  payOrder(@Req() req: AuthenticatedRequest, @Body() dto: PayOrderWithWalletDto) {
    const userId = this.getUserId(req);
    return this.walletService.payOrderWithBalance(userId, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
