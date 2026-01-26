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
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DisputeQueryDto } from './dto/dispute-query.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  list(@Query() query: DisputeQueryDto) {
    return this.disputesService.listDisputes(query);
  }

  @Get(':id')
  get(@Param('id') disputeId: string) {
    return this.disputesService.getDispute(disputeId);
  }

  @Post(':id/resolve')
  resolve(
    @Req() req: AuthenticatedRequest,
    @Param('id') disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    const userId = this.getUserId(req);
    return this.disputesService.resolveDispute(disputeId, userId, dto);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
