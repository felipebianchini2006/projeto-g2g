import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { SettlementModule } from '../settlement/settlement.module';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [AuthModule, EmailModule, SettlementModule],
  controllers: [DisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
