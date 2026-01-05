import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { EfiClient } from './efi/efi-client.service';

type PixCharge = {
  txid: string;
  qrCode?: string | null;
  copyPaste?: string | null;
  expiresAt: Date;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly efiClient: EfiClient,
  ) {}

  async createPixCharge(order: {
    id: string;
    totalAmountCents: number;
    currency: string;
    expiresAt: Date | null;
    status?: OrderStatus;
  }, payerId: string) {
    if (order.status && !this.isPaymentAllowed(order.status)) {
      throw new BadRequestException('Order cannot be paid in the current state.');
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
    });

    if (existing) {
      return existing;
    }

    const mockMode = this.configService.get<string>('PIX_MOCK_MODE') ?? 'true';
    const pix =
      mockMode === 'true'
        ? this.buildMockPix(order.id, order.expiresAt)
        : await this.efiClient.createImmediateCharge({
            orderId: order.id,
            amountCents: order.totalAmountCents,
            expiresAt: order.expiresAt,
          });

    return this.prisma.payment.create({
      data: {
        orderId: order.id,
        payerId,
        provider: PaymentProvider.EFI,
        txid: pix.txid,
        status: PaymentStatus.PENDING,
        amountCents: order.totalAmountCents,
        currency: order.currency,
        qrCode: pix.qrCode ?? undefined,
        copyPaste: pix.copyPaste ?? undefined,
        expiresAt: pix.expiresAt,
      },
    });
  }

  async createPixChargeForOrder(orderId: string, payerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    if (order.buyerId !== payerId) {
      throw new ForbiddenException('Only the buyer can create the Pix charge.');
    }
    if (!this.isPaymentAllowed(order.status)) {
      throw new BadRequestException('Order cannot be paid in the current state.');
    }

    return this.createPixCharge(order, payerId);
  }

  private buildMockPix(orderId: string, expiresAtOverride: Date | null): PixCharge {
    const ttlSeconds = this.configService.get<number>('PIX_MOCK_TTL_SECONDS') ?? 900;
    const expiresAt = expiresAtOverride ?? new Date(Date.now() + ttlSeconds * 1000);
    const txid = randomUUID().replace(/-/g, '').slice(0, 26);
    const payload = `00020101021126580014br.gov.bcb.pix0136g2g-${orderId}5204000053039865802BR5920G2G Marketplace6009Sao Paulo62100506${txid}6304`;
    return {
      txid,
      qrCode: `PIX:${txid}`,
      copyPaste: payload,
      expiresAt,
    };
  }

  private isPaymentAllowed(status: OrderStatus) {
    return status === OrderStatus.CREATED || status === OrderStatus.AWAITING_PAYMENT;
  }
}
