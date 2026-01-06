import { Module } from '@nestjs/common';

import { SettlementModule } from '../settlement/settlement.module';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

@Module({
  imports: [SettlementModule],
  controllers: [DisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
