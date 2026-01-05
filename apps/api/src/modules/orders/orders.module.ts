import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ListingsModule } from '../listings/listings.module';
import { LoggerModule } from '../logger/logger.module';
import { PaymentsModule } from '../payments/payments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CheckoutController } from './checkout.controller';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersProcessor } from './orders.processor';
import { OrdersQueueService } from './orders.queue.service';
import { OrdersService } from './orders.service';
import { OrderAccessGuard } from './guards/order-access.guard';
import { SettlementModule } from '../settlement/settlement.module';

@Module({
  imports: [PrismaModule, AuthModule, ListingsModule, LoggerModule, PaymentsModule, SettlementModule],
  controllers: [OrdersController, CheckoutController, AdminOrdersController],
  providers: [OrdersService, OrdersQueueService, OrdersProcessor, OrderAccessGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
