import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminUsersController } from './admin-users.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { PublicUsersController } from './public-users.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AdminUsersController, UsersController, PublicUsersController, PublicReviewsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
