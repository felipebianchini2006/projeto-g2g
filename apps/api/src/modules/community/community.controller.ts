import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CommunityService } from './community.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { SetPinnedDto } from './dto/set-pinned.dto';
import { ToggleLikeDto } from './dto/toggle-like.dto';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Post('posts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  createPost(@Req() req: AuthenticatedRequest, @Body() dto: CreateCommunityPostDto) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? UserRole.USER;
    return this.communityService.createPost(userId, role, dto);
  }

  @Patch('posts/:id/pin')
  setPinned(
    @Req() req: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() dto: SetPinnedDto,
  ) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? UserRole.USER;
    return this.communityService.setPinned(postId, userId, role, dto.pinned);
  }

  @Delete('posts/:id')
  removePost(@Req() req: AuthenticatedRequest, @Param('id') postId: string) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? UserRole.USER;
    return this.communityService.deletePost(postId, userId, role);
  }

  @Post('posts/:id/like')
  toggleLike(
    @Req() req: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() _dto: ToggleLikeDto,
  ) {
    const userId = this.getUserId(req);
    return this.communityService.toggleLike(postId, userId);
  }

  @Post('posts/:id/comments')
  createComment(
    @Req() req: AuthenticatedRequest,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const userId = this.getUserId(req);
    return this.communityService.createComment(postId, userId, dto);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
