import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCouponsController } from './admin-coupons.controller';
import { CouponsService } from './coupons.service';
import { PublicCouponsController } from './public-coupons.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminCouponsController, PublicCouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule { }
