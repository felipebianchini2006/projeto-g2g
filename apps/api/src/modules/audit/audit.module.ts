import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditInterceptor } from './admin-audit.interceptor';
import { AuditLogsService } from './audit-logs.service';

@Module({
  controllers: [AdminAuditController],
  providers: [
    AuditLogsService,
    AdminAuditInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AdminAuditInterceptor,
    },
  ],
})
export class AuditModule {}
