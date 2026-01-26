import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SettlementService } from '../settlement/settlement.service';
import { AdminOrderActionDto } from './dto/admin-order-action.dto';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.orders')
export class AdminOrdersController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post(':id/release')
  async releaseOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: AdminOrderActionDto,
  ) {
    const userId = this.getUserId(req);
    return this.settlementService.releaseOrder(orderId, userId, dto.reason);
  }

  @Post(':id/refund')
  async refundOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: AdminOrderActionDto,
  ) {
    const userId = this.getUserId(req);
    return this.settlementService.refundOrder(orderId, userId, dto.reason);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
