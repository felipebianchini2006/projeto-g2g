import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TwilioClientService } from './twilio-client.service';

export type VerifyChannel = 'email' | 'whatsapp' | 'sms';

@Injectable()
export class TwilioVerifyService {
  private readonly serviceSid: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioClient: TwilioClientService,
  ) {
    this.serviceSid = this.configService.getOrThrow<string>('TWILIO_VERIFY_SERVICE_SID');
  }

  async sendVerification(to: string, channel: VerifyChannel) {
    return this.twilioClient.client.verify.v2
      .services(this.serviceSid)
      .verifications.create({ to, channel });
  }

  async checkVerification(to: string, code: string) {
    return this.twilioClient.client.verify.v2
      .services(this.serviceSid)
      .verificationChecks.create({ to, code });
  }
}
