import { Controller, Get, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WalletEntriesQueryDto } from './dto/wallet-entries-query.dto';
import { WalletService } from './wallet.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.SELLER, UserRole.ADMIN)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('summary')
  getSummary(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.walletService.getSummary(userId);
  }

  @Get('entries')
  listEntries(
    @Req() req: AuthenticatedRequest,
    @Query() query: WalletEntriesQueryDto,
  ) {
    const userId = this.getUserId(req);
    return this.walletService.listEntries(userId, query);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
