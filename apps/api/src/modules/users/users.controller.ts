import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateUserProfileDto) {
    const userId = this.getUserId(req);
    return this.usersService.updateProfile(userId, dto);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
