import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { envSchema } from './config/env.schema';
import { AuthModule } from './modules/auth/auth.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { ListingsModule } from './modules/listings/listings.module';
import { LoggerModule } from './modules/logger/logger.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { RequestContextModule } from './modules/request-context/request-context.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ChatModule } from './modules/chat/chat.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SupportChatModule } from './modules/support-chat/support-chat.module';
import { DirectChatModule } from './modules/direct-chat/direct-chat.module';
import { PartnersModule } from './modules/partners/partners.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { CommunityModule } from './modules/community/community.module';
import { ListingQuestionsModule } from './modules/listing-questions/listing-questions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RgVerificationModule } from './modules/rg-verification/rg-verification.module';
import { SecurityModule } from './modules/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
      expandVariables: true,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60, limit: 100 },
      { name: 'auth', ttl: 60, limit: 10 },
      { name: 'chat', ttl: 60, limit: 30 },
      { name: 'webhook', ttl: 60, limit: 120 },
    ]),
    LoggerModule,
    PrismaModule,
    RedisModule,
    RequestContextModule,
    AuthModule,
    DisputesModule,
    EmailModule,
    ChatModule,
    CatalogModule,
    HealthModule,
    ListingsModule,
    NotificationsModule,
    OrdersModule,
    SettingsModule,
    TicketsModule,
    UsersModule,
    WalletModule,
    WebhooksModule,
    SupportChatModule,
    DirectChatModule,
    PartnersModule,
    CouponsModule,
    CommunityModule,
    ListingQuestionsModule,
    ReportsModule,
    RgVerificationModule,
    SecurityModule,
  ],
})
export class AppModule { }
