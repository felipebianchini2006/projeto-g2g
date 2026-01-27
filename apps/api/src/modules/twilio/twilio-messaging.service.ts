import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TwilioClientService } from './twilio-client.service';

@Injectable()
export class TwilioMessagingService {
  private readonly whatsappFrom?: string;
  private readonly smsFrom?: string;
  private readonly messagingServiceSid?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly twilioClient: TwilioClientService,
  ) {
    this.whatsappFrom = this.configService.get<string>('TWILIO_WHATSAPP_FROM');
    this.smsFrom = this.configService.get<string>('TWILIO_SMS_FROM');
    this.messagingServiceSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID');
  }

  async sendSms(toE164: string, body: string) {
    if (!this.messagingServiceSid && !this.smsFrom) {
      throw new Error(
        'Twilio SMS sender not configured. Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM.',
      );
    }
    if (this.messagingServiceSid) {
      return this.twilioClient.client.messages.create({
        messagingServiceSid: this.messagingServiceSid,
        to: toE164,
        body,
      });
    }
    return this.twilioClient.client.messages.create({
      from: this.smsFrom,
      to: toE164,
      body,
    });
  }

  async sendWhatsApp(toE164: string, body: string) {
    if (!this.whatsappFrom) {
      throw new Error('Twilio WhatsApp sender not configured. Set TWILIO_WHATSAPP_FROM.');
    }
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
