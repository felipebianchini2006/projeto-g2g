import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { UserBlockDto } from './dto/user-block.dto';
import { UserUpdateDto } from './dto/user-update.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  list(@Query() query: UsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Post(':id/block')
  block(@Req() req: AuthenticatedRequest, @Param('id') userId: string, @Body() dto: UserBlockDto) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.usersService.blockUser(userId, adminId, dto, meta);
  }

  @Post(':id/unblock')
  unblock(@Req() req: AuthenticatedRequest, @Param('id') userId: string) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.usersService.unblockUser(userId, adminId, meta);
  }

  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() dto: UserUpdateDto,
  ) {
    const adminId = this.getUserId(req);
    const meta = this.getRequestMeta(req);
    return this.usersService.updateUser(userId, adminId, dto, meta);
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
