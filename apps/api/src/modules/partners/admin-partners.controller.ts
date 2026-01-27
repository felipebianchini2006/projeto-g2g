import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnersService } from './partners.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/partners')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.partners')
export class AdminPartnersController {
  constructor(private readonly partnersService: PartnersService) { }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePartnerDto) {
    const adminId = this.getUserId(req);
    return this.partnersService.createPartner(dto, adminId, this.getRequestMeta(req));
  }

  @Get()
  list() {
    return this.partnersService.listPartners();
  }

  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    const adminId = this.getUserId(req);
    return this.partnersService.updatePartner(id, dto, adminId, this.getRequestMeta(req));
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.partnersService.getPartnerStats(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.partnersService.deletePartner(id);
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
