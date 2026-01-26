import { Module } from '@nestjs/common';

import { TwilioClientService } from './twilio-client.service';
import { TwilioMessagingService } from './twilio-messaging.service';
import { TwilioVerifyService } from './twilio-verify.service';

@Module({
  providers: [TwilioClientService, TwilioMessagingService, TwilioVerifyService],
  exports: [TwilioMessagingService, TwilioVerifyService],
})
export class TwilioModule {}
