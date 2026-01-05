import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

type PixCharge = {
  txid: string;
  qrCode: string;
  copyPaste: string;
  expiresAt: Date;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createPixCharge(order: { id: string; totalAmountCents: number; currency: string; expiresAt: Date | null }, payerId: string) {
    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
    });

    if (existing) {
      return existing;
    }

    const mockMode = this.configService.get<string>('PIX_MOCK_MODE') ?? 'true';
    if (mockMode !== 'true') {
      throw new BadRequestException('Pix integration not configured.');
    }

    const ttlSeconds = this.configService.get<number>('PIX_MOCK_TTL_SECONDS') ?? 900;
    const expiresAt = order.expiresAt ?? new Date(Date.now() + ttlSeconds * 1000);
    const pix = this.buildMockPix(order.id, expiresAt);

    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        payerId,
        provider: PaymentProvider.EFI,
        txid: pix.txid,
        status: PaymentStatus.PENDING,
        amountCents: order.totalAmountCents,
        currency: order.currency,
        qrCode: pix.qrCode,
        copyPaste: pix.copyPaste,
        expiresAt,
      },
    });
  }

  private buildMockPix(orderId: string, expiresAt: Date): PixCharge {
    const txid = randomUUID().replace(/-/g, '').slice(0, 26);
    const payload = `00020101021126580014br.gov.bcb.pix0136g2g-${orderId}5204000053039865802BR5920G2G Marketplace6009Sao Paulo62100506${txid}6304`;
    return {
      txid,
      qrCode: `PIX:${txid}`,
      copyPaste: payload,
      expiresAt,
    };
  }
}
