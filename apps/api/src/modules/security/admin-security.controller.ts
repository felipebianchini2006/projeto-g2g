import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminBalanceAdjustDto } from './dto/admin-balance-adjust.dto';
import { AdminPayoutBlockDto } from './dto/admin-payout-block.dto';
import { AdminSecurityPayoutsQueryDto } from './dto/admin-security-payouts-query.dto';
import { AdminUserBlockDto } from './dto/admin-user-block.dto';
import { SecurityService } from './security.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('payouts')
  listPayouts(@Query() query: AdminSecurityPayoutsQueryDto) {
    return this.securityService.listPayoutRequests(query);
  }

  @Post('users/:userId/balance-adjust')
  adjustBalance(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminBalanceAdjustDto,
  ) {
    this.ensureAdmin(req);
    return this.securityService.adjustBalance(userId, dto);
  }

  @Post('users/:userId/payout-block')
  blockPayout(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminPayoutBlockDto,
  ) {
    this.ensureAdmin(req);
    return this.securityService.blockPayouts(userId, dto);
  }

  @Post('users/:userId/payout-unblock')
  unblockPayout(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    this.ensureAdmin(req);
    return this.securityService.unblockPayouts(userId);
  }

  @Post('users/:userId/block')
  blockUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: AdminUserBlockDto,
  ) {
    this.ensureAdmin(req);
    return this.securityService.blockUser(userId, dto);
  }

  @Post('users/:userId/unblock')
  unblockUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    this.ensureAdmin(req);
    return this.securityService.unblockUser(userId);
  }

  private ensureAdmin(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
  }
}
