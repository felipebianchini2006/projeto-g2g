import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminPartnersController } from './admin-partners.controller';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminPartnersController, PartnersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
