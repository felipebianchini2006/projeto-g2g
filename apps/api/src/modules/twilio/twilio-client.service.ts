import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { Twilio } from 'twilio';

@Injectable()
export class TwilioClientService {
  readonly client: Twilio;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.client = twilio(accountSid, authToken);
  }
}
