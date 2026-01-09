import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppLogger } from '../../logger/logger.service';
import { EfiHttpService } from './efi-http.service';
import type {
  EfiCobRequest,
  EfiCobResponse,
  EfiOauthTokenResponse,
  EfiPixRefundRequest,
  EfiPixRefundResponse,
  EfiPixSendRequest,
  EfiPixSendResponse,
  EfiQrCodeResponse,
} from './efi.types';

type TokenCache = {
  value: string;
  expiresAt: number;
};

type PixChargeInput = {
  orderId: string;
  amountCents: number;
  expiresAt: Date | null;
};

type PixChargeResult = {
  txid: string;
  expiresAt: Date;
  qrCode?: string | null;
  copyPaste?: string | null;
};

type PixCashOutInput = {
  payoutPixKey: string;
  amountCents: number;
  description?: string;
  idempotencyKey?: string;
};

type PixRefundInput = {
  e2eId: string;
  refundId: string;
  amountCents: number;
  reason?: string;
};

@Injectable()
export class EfiClient {
  private token?: TokenCache;

  constructor(
    private readonly httpService: EfiHttpService,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  async createImmediateCharge(input: PixChargeInput): Promise<PixChargeResult> {
    const accessToken = await this.getAccessToken();
    const pixKey = this.getRequired('EFI_PIX_KEY');
    const expiresInSeconds = this.resolveExpirationSeconds(input.expiresAt);

    const cobBody: EfiCobRequest = {
      calendario: { expiracao: expiresInSeconds },
      valor: { original: this.formatAmount(input.amountCents) },
      chave: pixKey,
      solicitacaoPagador: `Pedido ${input.orderId}`,
    };

    const cob = await this.httpService.request<EfiCobResponse>({
      method: 'POST',
      path: '/v2/cob',
      accessToken,
      body: cobBody,
      timeoutMs: 15000,
    });

    if (!cob?.txid) {
      throw new InternalServerErrorException('Efi Pix returned empty txid.');
    }

    const locId = cob.loc?.id;
    let qrCode: string | null = null;
    let copyPaste: string | null = null;

    if (locId) {
      const qr = await this.httpService.request<EfiQrCodeResponse>({
        method: 'GET',
        path: `/v2/loc/${locId}/qrcode`,
        accessToken,
        timeoutMs: 15000,
      });
      qrCode = qr.imagemQrcode ?? null;
      copyPaste = qr.qrcode ?? null;
    }

    const expiresAt =
      cob.calendario?.expiracao && cob.calendario.expiracao > 0
        ? new Date(Date.now() + cob.calendario.expiracao * 1000)
        : (input.expiresAt ?? new Date(Date.now() + expiresInSeconds * 1000));

    return {
      txid: cob.txid,
      expiresAt,
      qrCode,
      copyPaste,
    };
  }

  async registerWebhook(webhookUrl: string) {
    const accessToken = await this.getAccessToken();
    const pixKey = this.getRequired('EFI_PIX_KEY');
    const skipMtls = this.configService.get<string>('EFI_WEBHOOK_SKIP_MTLS_CHECKING') ?? 'false';
    const headers: Record<string, string> = {};

    if (skipMtls === 'true') {
      headers['x-skip-mtls-checking'] = 'true';
    }

    return this.httpService.request<Record<string, unknown>>({
      method: 'PUT',
      path: `/v2/webhook/${pixKey}`,
      accessToken,
      headers,
      body: { webhookUrl },
      timeoutMs: 15000,
    });
  }

  async cashOutPix(input: PixCashOutInput) {
    const accessToken = await this.getAccessToken();
    const body: EfiPixSendRequest = {
      valor: this.formatAmount(input.amountCents),
      chave: input.payoutPixKey,
      solicitacaoPagador: input.description ?? 'Cashout marketplace',
    };
    const headers: Record<string, string> = {};
    if (input.idempotencyKey) {
      headers['x-idempotency-key'] = input.idempotencyKey;
    }
    return this.httpService.request<EfiPixSendResponse>({
      method: 'POST',
      path: '/v2/gn/pix/send',
      accessToken,
      headers,
      body,
      timeoutMs: 15000,
    });
  }

  async refundPix(input: PixRefundInput) {
    const accessToken = await this.getAccessToken();
    const body: EfiPixRefundRequest = {
      valor: this.formatAmount(input.amountCents),
      descricao: input.reason,
    };
    return this.httpService.request<EfiPixRefundResponse>({
      method: 'PUT',
      path: `/v2/pix/${input.e2eId}/devolucao/${input.refundId}`,
      accessToken,
      body,
      timeoutMs: 15000,
    });
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt > now + 60000) {
      return this.token.value;
    }

    const clientId = this.getRequired('EFI_CLIENT_ID');
    const clientSecret = this.getRequired('EFI_CLIENT_SECRET');
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await this.httpService.request<EfiOauthTokenResponse>({
      method: 'POST',
      path: '/oauth/token',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: { grant_type: 'client_credentials' },
      timeoutMs: 15000,
    });

    if (!response?.access_token) {
      this.logger.error('Efi token response missing access_token', undefined, 'EfiClient');
      throw new InternalServerErrorException('Efi OAuth token not received.');
    }

    const expiresIn = Number(response.expires_in ?? 3600);
    this.token = {
      value: response.access_token,
      expiresAt: now + expiresIn * 1000,
    };

    return this.token.value;
  }

  private resolveExpirationSeconds(expiresAt: Date | null) {
    const defaultSeconds = this.configService.get<number>('ORDER_PAYMENT_TTL_SECONDS') ?? 900;
    if (!expiresAt) {
      return defaultSeconds;
    }
    const diffSeconds = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
    return Math.max(diffSeconds, 60);
  }

  private formatAmount(amountCents: number) {
    return (amountCents / 100).toFixed(2);
  }

  private getRequired(name: string) {
    const value = this.configService.get<string>(name);
    if (!value) {
      throw new InternalServerErrorException(`Missing ${name} for Efi Pix integration.`);
    }
    return value;
  }
}
