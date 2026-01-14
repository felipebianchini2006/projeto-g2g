import { Controller, Get, Param, Query } from '@nestjs/common';

import { ListingQuestionsQueryDto } from './dto/listing-questions-query.dto';
import { ListingQuestionsService } from './listing-questions.service';

@Controller('public/listings')
export class ListingQuestionsPublicController {
  constructor(private readonly listingQuestionsService: ListingQuestionsService) {}

  @Get(':id/questions')
  list(@Param('id') listingId: string, @Query() query: ListingQuestionsQueryDto) {
    return this.listingQuestionsService.listPublicQuestions(listingId, query);
  }
}
