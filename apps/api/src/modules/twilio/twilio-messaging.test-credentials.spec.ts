import type { ConfigService } from '@nestjs/config';

import { TwilioClientService } from './twilio-client.service';
import { TwilioMessagingService } from './twilio-messaging.service';

const shouldRun =
  Boolean(process.env.TWILIO_TEST_ACCOUNT_SID) &&
  Boolean(process.env.TWILIO_TEST_AUTH_TOKEN) &&
  Boolean(process.env.TWILIO_TEST_TO);

const describeMaybe = shouldRun ? describe : describe.skip;

describeMaybe('TwilioMessagingService (test credentials)', () => {
  it('sends SMS using Twilio test credentials without cost', async () => {
    const accountSid = process.env.TWILIO_TEST_ACCOUNT_SID as string;
    const authToken = process.env.TWILIO_TEST_AUTH_TOKEN as string;
    const to = process.env.TWILIO_TEST_TO as string;
    const smsFrom = process.env.TWILIO_TEST_SMS_FROM ?? '+15005550006';

    const configService: Pick<ConfigService, 'getOrThrow' | 'get'> = {
      getOrThrow: (key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') {
          return accountSid;
        }
        if (key === 'TWILIO_AUTH_TOKEN') {
          return authToken;
        }
        throw new Error(`Missing config for ${key}`);
      },
      get: (key: string) => {
        if (key === 'TWILIO_SMS_FROM') {
          return smsFrom;
        }
        return undefined;
      },
    };

    const twilioClient = new TwilioClientService(configService as ConfigService);
    const messaging = new TwilioMessagingService(configService as ConfigService, twilioClient);

    const result = await messaging.sendSms(to, 'teste');
    expect(result?.sid).toBeTruthy();
  });
});
