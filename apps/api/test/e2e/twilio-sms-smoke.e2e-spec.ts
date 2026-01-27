import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { TwilioClientService } from '../../src/modules/twilio/twilio-client.service';
import { TwilioMessagingService } from '../../src/modules/twilio/twilio-messaging.service';

const shouldRun = process.env.E2E_TWILIO_REAL === 'true';
const describeMaybe = shouldRun ? describe : describe.skip;

describeMaybe('Twilio SMS (smoke e2e)', () => {
  const requiredEnv = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'E2E_TWILIO_TO',
  ];

  const configService: Pick<ConfigService, 'getOrThrow' | 'get'> = {
    getOrThrow: (key: string) => {
      const value = process.env[key];
      if (!value) {
        throw new Error(`Missing env: ${key}`);
      }
      return value;
    },
    get: (key: string) => process.env[key],
  };

  it('sends an SMS message using Twilio credentials', async () => {
    for (const key of requiredEnv) {
      if (!process.env[key]) {
        throw new Error(`Missing env: ${key}`);
      }
    }
    if (!process.env.TWILIO_MESSAGING_SERVICE_SID && !process.env.TWILIO_SMS_FROM) {
      throw new Error(
        'Missing env: TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM',
      );
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
      `Teste SMS G2G ${new Date().toISOString()}`;

    await messaging.sendSms(to, body);

    await moduleRef.close();
  });
});
