import { Body, Controller, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputesService } from './disputes.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

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
