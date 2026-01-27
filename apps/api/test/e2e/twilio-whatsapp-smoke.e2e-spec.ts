import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { TwilioClientService } from '../../src/modules/twilio/twilio-client.service';
import { TwilioMessagingService } from '../../src/modules/twilio/twilio-messaging.service';

const shouldRun = process.env.E2E_TWILIO_REAL === 'true';
const describeMaybe = shouldRun ? describe : describe.skip;

describeMaybe('Twilio WhatsApp (smoke e2e)', () => {
  const requiredEnv = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_FROM',
    'E2E_TWILIO_TO',
  ];

  const configService: Pick<ConfigService, 'getOrThrow'> = {
    getOrThrow: (key: string) => {
      const value = process.env[key];
      if (!value) {
        throw new Error(`Missing env: ${key}`);
      }
      return value;
    },
  };

  it('sends a WhatsApp message using Twilio credentials', async () => {
    for (const key of requiredEnv) {
      if (!process.env[key]) {
        throw new Error(`Missing env: ${key}`);
      }
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        TwilioClientService,
        TwilioMessagingService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const messaging = moduleRef.get(TwilioMessagingService);
    const to = process.env.E2E_TWILIO_TO as string;
    const body =
      process.env.E2E_TWILIO_BODY ??
      `Teste WhatsApp G2G ${new Date().toISOString()}`;

    await messaging.sendWhatsApp(to, body);

    await moduleRef.close();
  });
});
