import { Body, Controller, Get, Put, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Put()
  updateSettings(@Req() req: AuthenticatedRequest, @Body() dto: UpdateSettingsDto) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.settingsService.updateSettings(adminId, dto, meta);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
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
