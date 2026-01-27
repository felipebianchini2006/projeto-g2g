import {
  Body,
  Controller,
  Delete,
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

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.types';
import { AnswerListingQuestionDto } from './dto/answer-listing-question.dto';
import { CreateListingQuestionDto } from './dto/create-listing-question.dto';
import { ListingQuestionsQueryDto } from './dto/listing-questions-query.dto';
import { ListingQuestionsService } from './listing-questions.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller()
@UseGuards(JwtAuthGuard)
export class ListingQuestionsController {
  constructor(private readonly listingQuestionsService: ListingQuestionsService) { }

  @Post('listings/:id/questions')
  create(
    @Req() req: AuthenticatedRequest,
    @Param('id') listingId: string,
    @Body() dto: CreateListingQuestionDto,
  ) {
    const user = this.getUser(req);
    return this.listingQuestionsService.createQuestion(listingId, user.sub, dto);
  }

  @Patch('listing-questions/:id/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  answer(
    @Req() req: AuthenticatedRequest,
    @Param('id') questionId: string,
    @Body() dto: AnswerListingQuestionDto,
  ) {
    const user = this.getUser(req);
    return this.listingQuestionsService.answerQuestion(
      questionId,
      user.sub,
      user.role,
      dto,
    );
  }

  @Get('listing-questions')
  list(@Req() req: AuthenticatedRequest, @Query() query: ListingQuestionsQueryDto) {
    const user = this.getUser(req);
    return this.listingQuestionsService.listQuestions(user.sub, user.role, query);
  }

  @Delete('listing-questions/:id')
  remove(@Req() req: AuthenticatedRequest, @Param('id') questionId: string) {
    const user = this.getUser(req);
    return this.listingQuestionsService.deleteQuestion(questionId, user.sub);
  }

  private getUser(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }
    return request.user;
  }
}
