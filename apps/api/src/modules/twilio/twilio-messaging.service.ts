import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TwilioClientService } from './twilio-client.service';

@Injectable()
export class TwilioMessagingService {
  private readonly whatsappFrom: string;
  private readonly smsFrom: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioClient: TwilioClientService,
  ) {
    this.whatsappFrom = this.configService.getOrThrow<string>('TWILIO_WHATSAPP_FROM');
    this.smsFrom = this.configService.get<string>('TWILIO_SMS_FROM') ?? this.whatsappFrom.replace('whatsapp:', '');
  }

  async sendSms(toE164: string, body: string) {
    return this.twilioClient.client.messages.create({
      from: this.smsFrom,
      to: toE164,
      body,
    });
  }

  async sendWhatsApp(toE164: string, body: string) {
    const from = this.normalizeWhatsAppAddress(this.whatsappFrom);
    const to = this.normalizeWhatsAppAddress(toE164);

    return this.twilioClient.client.messages.create({
      from,
      to,
      body,
    });
  }

  private normalizeWhatsAppAddress(value: string) {
    return value.startsWith('whatsapp:') ? value : `whatsapp:${value}`;
  }
}
