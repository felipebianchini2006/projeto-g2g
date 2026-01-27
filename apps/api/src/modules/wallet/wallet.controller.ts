import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
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
import { RequestPayoutVerificationDto } from './dto/request-payout-verification.dto';
import { ConfirmPayoutVerificationDto } from './dto/confirm-payout-verification.dto';
import { WalletService } from './wallet.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };
const PAYOUT_THROTTLE = { default: { ttl: 60, limit: 5 } };

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
  @UseGuards(ThrottlerGuard)
  @Throttle(PAYOUT_THROTTLE)
  createPayout(@Req() req: AuthenticatedRequest, @Body() dto: CreatePayoutDto) {
    const userId = this.getUserId(req);
    return this.walletService.requestPayoutVerification(userId, dto);
  }

  @Post('payouts/request')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @UseGuards(ThrottlerGuard)
  @Throttle(PAYOUT_THROTTLE)
  requestPayout(@Req() req: AuthenticatedRequest, @Body() dto: RequestPayoutVerificationDto) {
    const userId = this.getUserId(req);
    return this.walletService.requestPayoutVerification(userId, dto);
  }

  @Post('payouts/confirm')
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  @UseGuards(ThrottlerGuard)
  @Throttle(PAYOUT_THROTTLE)
  confirmPayout(@Req() req: AuthenticatedRequest, @Body() dto: ConfirmPayoutVerificationDto) {
    const userId = this.getUserId(req);
    return this.walletService.confirmPayoutVerification(userId, dto, {
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
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }
    return request.user.sub;
  }
}
