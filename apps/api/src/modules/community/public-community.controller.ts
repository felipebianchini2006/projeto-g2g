import { Controller, Get, Param, Query } from '@nestjs/common';

import { CommunityService } from './community.service';
import { ListCommentsQueryDto } from './dto/list-comments-query.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';

@Controller('public')
export class PublicCommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('users/:id/posts')
  listUserPosts(@Param('id') userId: string, @Query() query: ListPostsQueryDto) {
    return this.communityService.listPublicPostsByUser(userId, query);
  }

  @Get('posts/:id/comments')
  listComments(@Param('id') postId: string, @Query() query: ListCommentsQueryDto) {
    return this.communityService.listPublicComments(postId, query);
  }
}
