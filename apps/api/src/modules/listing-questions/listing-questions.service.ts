import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AnswerListingQuestionDto } from './dto/answer-listing-question.dto';
import { CreateListingQuestionDto } from './dto/create-listing-question.dto';
import {
  ListingQuestionScope,
  ListingQuestionsQueryDto,
} from './dto/listing-questions-query.dto';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  avatarUrl: true,
};

@Injectable()
export class ListingQuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicQuestions(listingId: string, query: ListingQuestionsQueryDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    const take = query.take ?? 20;
    const skip = query.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listingQuestion.findMany({
        where: { listingId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          askedBy: { select: userSelect },
          answeredBy: { select: userSelect },
        },
      }),
      this.prisma.listingQuestion.count({ where: { listingId } }),
    ]);

    return { items, total, skip, take };
  }

  async createQuestion(listingId: string, userId: string, dto: CreateListingQuestionDto) {
    const question = dto.question.trim();
    if (!question) {
      throw new BadRequestException('Question cannot be empty.');
    }

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true, title: true },
      });
      if (!listing) {
        throw new NotFoundException('Listing not found.');
      }

      const created = await tx.listingQuestion.create({
        data: {
          listingId,
          askedById: userId,
          question,
        },
        include: {
          askedBy: { select: userSelect },
          answeredBy: { select: userSelect },
        },
      });

      await tx.notification.create({
        data: {
          userId: listing.sellerId,
          type: NotificationType.SYSTEM,
          title: 'Nova pergunta no seu anuncio',
          body: `Voce recebeu uma nova pergunta no anuncio "${listing.title}".`,
        },
      });

      return created;
    });
  }

  async answerQuestion(
    questionId: string,
    userId: string,
    role: UserRole,
    dto: AnswerListingQuestionDto,
  ) {
    const answer = dto.answer.trim();
    if (!answer) {
      throw new BadRequestException('Answer cannot be empty.');
    }

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.listingQuestion.findUnique({
        where: { id: questionId },
        include: {
          listing: { select: { id: true, sellerId: true, title: true } },
        },
      });

      if (!question) {
        throw new NotFoundException('Question not found.');
      }

      if (question.answer) {
        throw new BadRequestException('Question already answered.');
      }

      if (role !== UserRole.ADMIN && question.listing.sellerId !== userId) {
        throw new ForbiddenException('Only the listing seller can answer.');
      }

      const updated = await tx.listingQuestion.update({
        where: { id: question.id },
        data: {
          answer,
          answeredById: userId,
          answeredAt: new Date(),
        },
        include: {
          askedBy: { select: userSelect },
          answeredBy: { select: userSelect },
        },
      });

      await tx.notification.create({
        data: {
          userId: question.askedById,
          type: NotificationType.SYSTEM,
          title: 'Sua pergunta foi respondida',
          body: `O vendedor respondeu sua pergunta no anuncio "${question.listing.title}".`,
        },
      });

      return updated;
    });
  }

  async listQuestions(userId: string, role: UserRole, query: ListingQuestionsQueryDto) {
    const take = query.take ?? 20;
    const skip = query.skip ?? 0;
    const scope = query.scope ?? ListingQuestionScope.Sent;

    if (scope === ListingQuestionScope.Received) {
      if (role !== UserRole.SELLER && role !== UserRole.ADMIN) {
        throw new ForbiddenException('Seller scope not allowed.');
      }

      return this.prisma.listingQuestion.findMany({
        where:
          role === UserRole.ADMIN ? undefined : { listing: { sellerId: userId } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          askedBy: { select: userSelect },
          answeredBy: { select: userSelect },
          listing: {
            select: {
              id: true,
              title: true,
              sellerId: true,
              media: {
                orderBy: { position: 'asc' },
                take: 1,
                select: { id: true, url: true, type: true },
              },
            },
          },
        },
      });
    }

    return this.prisma.listingQuestion.findMany({
      where: { askedById: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        askedBy: { select: userSelect },
        answeredBy: { select: userSelect },
        listing: {
          select: {
            id: true,
            title: true,
            sellerId: true,
            media: {
              orderBy: { position: 'asc' },
              take: 1,
              select: { id: true, url: true, type: true },
            },
          },
        },
      },
    });
  }

  async deleteQuestion(questionId: string, userId: string) {
    const question = await this.prisma.listingQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, askedById: true, answer: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found.');
    }

    if (question.askedById !== userId) {
      throw new ForbiddenException('Only the author can delete the question.');
    }

    if (question.answer) {
      throw new BadRequestException('Answered questions cannot be deleted.');
    }

    await this.prisma.listingQuestion.delete({ where: { id: questionId } });
    return { success: true };
  }
}
