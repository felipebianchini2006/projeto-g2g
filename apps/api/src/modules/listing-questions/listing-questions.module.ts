import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ListingQuestionsController } from './listing-questions.controller';
import { ListingQuestionsPublicController } from './listing-questions.public.controller';
import { ListingQuestionsService } from './listing-questions.service';

@Module({
  imports: [AuthModule],
  controllers: [ListingQuestionsController, ListingQuestionsPublicController],
  providers: [ListingQuestionsService],
})
export class ListingQuestionsModule {}
