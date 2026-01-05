import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AppLogger } from '../../logger/logger.service';
import { EfiClient } from './efi-client.service';
import { EfiHttpService } from './efi-http.service';

describe('EfiClient', () => {
  let client: EfiClient;
  let httpMock: { request: jest.Mock };

  beforeEach(async () => {
    httpMock = {
      request: jest.fn(),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'EFI_CLIENT_ID') return 'client-id';
        if (key === 'EFI_CLIENT_SECRET') return 'client-secret';
        if (key === 'EFI_PIX_KEY') return 'pix-key';
        if (key === 'ORDER_PAYMENT_TTL_SECONDS') return 900;
        return undefined;
      }),
    } as unknown as ConfigService;

    const loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as AppLogger;

    const moduleRef = await Test.createTestingModule({
      providers: [
        EfiClient,
        { provide: EfiHttpService, useValue: httpMock },
        { provide: ConfigService, useValue: configMock },
        { provide: AppLogger, useValue: loggerMock },
      ],
    }).compile();

    client = moduleRef.get(EfiClient);
  });

  it('creates immediate charge and returns QR data', async () => {
    httpMock.request
      .mockResolvedValueOnce({ access_token: 'token-123', expires_in: 3600 })
      .mockResolvedValueOnce({ txid: 'tx-001', calendario: { expiracao: 900 }, loc: { id: 55 } })
      .mockResolvedValueOnce({ qrcode: 'payload', imagemQrcode: 'base64-image' });

    const result = await client.createImmediateCharge({
      orderId: 'order-1',
      amountCents: 1234,
      expiresAt: new Date(Date.now() + 900 * 1000),
    });

    expect(result.txid).toBe('tx-001');
    expect(result.copyPaste).toBe('payload');
    expect(result.qrCode).toBe('base64-image');

    const authRequest = httpMock.request.mock.calls[0][0];
    expect(authRequest.path).toBe('/oauth/token');
    expect(authRequest.headers.Authorization).toContain('Basic ');

    const cobRequest = httpMock.request.mock.calls[1][0];
    expect(cobRequest.path).toBe('/v2/cob');
    expect(cobRequest.body.valor.original).toBe('12.34');
  });
});
