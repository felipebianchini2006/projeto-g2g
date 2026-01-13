import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { PublicCommunityController } from './public-community.controller';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CommunityController, PublicCommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
