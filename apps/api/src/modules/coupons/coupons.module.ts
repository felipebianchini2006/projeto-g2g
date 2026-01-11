import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCouponsController } from './admin-coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminCouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
