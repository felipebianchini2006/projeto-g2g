import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ListCommentsQueryDto } from './dto/list-comments-query.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';

const getEmailPrefix = (email: string) => email.split('@')[0] || 'usuario';

const buildDisplayName = (fullName: string | null, email: string) => {
  if (fullName?.trim()) {
    return fullName.trim();
  }
  return `Usuario ${getEmailPrefix(email)}`;
};

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPostsByUser(userId: string, query: ListPostsQueryDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!userExists) {
      throw new NotFoundException('User not found.');
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? 10;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.communityPost.findMany({
        where: { authorId: userId },
        orderBy: [{ pinned: 'desc' }, { pinnedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: {
          author: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.communityPost.count({ where: { authorId: userId } }),
    ]);

    return {
      items: items.map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        couponCode: post.couponCode,
        pinned: post.pinned,
        createdAt: post.createdAt,
        author: {
          id: post.author.id,
          displayName: buildDisplayName(post.author.fullName, post.author.email),
          avatarUrl: post.author.avatarUrl,
        },
        stats: {
          likes: post._count.likes,
          comments: post._count.comments,
        },
      })),
      total,
    };
  }

  async listPublicComments(postId: string, query: ListCommentsQueryDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.communityPostComment.findMany({
        where: { postId },
        orderBy: { createdAt: 'asc' },
        skip,
        take,
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.communityPostComment.count({ where: { postId } }),
    ]);

    return {
      items: items.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          displayName: buildDisplayName(comment.user.fullName, comment.user.email),
          avatarUrl: comment.user.avatarUrl,
        },
      })),
      total,
    };
  }

  async createPost(authorId: string, role: UserRole, dto: CreateCommunityPostDto) {
    if (role !== UserRole.SELLER && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Insufficient role.');
    }

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true },
    });
    if (!author) {
      throw new NotFoundException('User not found.');
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      if (dto.pinned) {
        await tx.communityPost.updateMany({
          where: { authorId },
          data: { pinned: false, pinnedAt: null },
        });
      }

      return tx.communityPost.create({
        data: {
          authorId,
          title: dto.title,
          content: dto.content,
          couponCode: dto.couponCode,
          pinned: dto.pinned ?? false,
          pinnedAt: dto.pinned ? now : null,
        },
      });
    });
  }

  async setPinned(postId: string, actorId: string, actorRole: UserRole, pinned: boolean) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found.');
    }
    if (post.authorId !== actorId && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (pinned) {
        await tx.communityPost.updateMany({
          where: { authorId: post.authorId },
          data: { pinned: false, pinnedAt: null },
        });
      }
      return tx.communityPost.update({
        where: { id: postId },
        data: {
          pinned,
          pinnedAt: pinned ? new Date() : null,
        },
      });
    });
  }

  async deletePost(postId: string, actorId: string, actorRole: UserRole) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found.');
    }
    if (post.authorId !== actorId && actorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Not allowed.');
    }
    return this.prisma.communityPost.delete({ where: { id: postId } });
  }

  async toggleLike(postId: string, userId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityPostLike.findUnique({
        where: { postId_userId: { postId, userId } },
        select: { id: true },
      });

      let liked = false;
      if (existing) {
        await tx.communityPostLike.delete({ where: { id: existing.id } });
        liked = false;
      } else {
        await tx.communityPostLike.create({ data: { postId, userId } });
        liked = true;
      }

      const count = await tx.communityPostLike.count({ where: { postId } });
      return { liked, likes: count };
    });
  }

  async createComment(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.communityPostComment.create({
        data: {
          postId,
          userId,
          content: dto.content,
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        },
      });

      const count = await tx.communityPostComment.count({ where: { postId } });

      return {
        comment: {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          user: {
            id: comment.user.id,
            displayName: buildDisplayName(comment.user.fullName, comment.user.email),
            avatarUrl: comment.user.avatarUrl,
          },
        },
        comments: count,
      };
    });
  }
}
