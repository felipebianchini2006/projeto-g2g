import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';
import { SettlementModule } from '../settlement/settlement.module';
import { TwilioModule } from '../twilio/twilio.module';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PaymentsModule,
    OrdersModule,
    SettlementModule,
    TwilioModule,
  ],
  controllers: [WalletController, AdminWalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule { }
