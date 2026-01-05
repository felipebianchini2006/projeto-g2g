import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EfiClient } from './efi/efi-client.service';
import { EfiHttpService } from './efi/efi-http.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, AuthModule, LoggerModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, EfiHttpService, EfiClient],
  exports: [PaymentsService, EfiClient],
})
export class PaymentsModule {}
