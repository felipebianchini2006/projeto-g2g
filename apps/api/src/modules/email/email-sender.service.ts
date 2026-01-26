import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

import { AppLogger } from '../logger/logger.service';

export type EmailSendPayload = {
  to: string;
  subject: string;
  body: string;
};

@Injectable()
export class EmailSenderService {
  private readonly fromEmail: string;
  private readonly fromName: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    const apiKey = this.configService.getOrThrow<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.getOrThrow<string>('SENDGRID_FROM_EMAIL');
    const fromName = this.configService.get<string>('SENDGRID_FROM_NAME');
    this.fromName = fromName && fromName.trim().length > 0 ? fromName.trim() : null;

    sgMail.setApiKey(apiKey);
  }

  async send(payload: EmailSendPayload) {
    const from = this.fromName ? { email: this.fromEmail, name: this.fromName } : this.fromEmail;

    try {
      await sgMail.send({
        to: payload.to,
        from,
        subject: payload.subject,
        text: payload.body,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SendGrid send failed.';
      this.logger.error(message, undefined, `EmailSender:${payload.to}`);
      throw error;
    }
  }
}
