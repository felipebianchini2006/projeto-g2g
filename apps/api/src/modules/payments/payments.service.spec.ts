import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { EfiClient } from './efi/efi-client.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let prismaService: PrismaService;
  let efiClient: { createImmediateCharge: jest.Mock };

  beforeEach(async () => {
    const prismaMock = {
      order: {
        findUnique: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as PrismaService;

    efiClient = {
      createImmediateCharge: jest.fn(),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'PIX_MOCK_MODE') return 'false';
        if (key === 'PIX_MOCK_TTL_SECONDS') return 900;
        return undefined;
      }),
    } as unknown as ConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configMock },
        { provide: EfiClient, useValue: efiClient },
      ],
    }).compile();

    paymentsService = moduleRef.get(PaymentsService);
    prismaService = moduleRef.get(PrismaService);
  });

  it('creates a Pix payment using Efi', async () => {
    const order = {
      id: 'order-1',
      buyerId: 'buyer-1',
      totalAmountCents: 1500,
      currency: 'BRL',
      expiresAt: new Date(Date.now() + 900 * 1000),
      status: OrderStatus.AWAITING_PAYMENT,
    };

    (prismaService.order.findUnique as jest.Mock).mockResolvedValue(order);
    (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(null);
    efiClient.createImmediateCharge.mockResolvedValue({
      txid: 'tx-123',
      qrCode: 'image',
      copyPaste: 'payload',
      expiresAt: order.expiresAt,
    });
    (prismaService.payment.create as jest.Mock).mockImplementation(({ data }) => ({
      ...data,
      id: 'payment-1',
      status: PaymentStatus.PENDING,
    }));

    const payment = await paymentsService.createPixChargeForOrder(order.id, order.buyerId);

    expect(payment.txid).toBe('tx-123');
    expect(efiClient.createImmediateCharge).toHaveBeenCalled();
    expect(prismaService.payment.create).toHaveBeenCalled();
  });

  it('returns existing pending payment', async () => {
    const existing = { id: 'payment-1', status: PaymentStatus.PENDING };
    (prismaService.payment.findFirst as jest.Mock).mockResolvedValue(existing);

    const payment = await paymentsService.createPixCharge(
      { id: 'order-1', totalAmountCents: 1500, currency: 'BRL', expiresAt: null },
      'buyer-1',
    );

    expect(payment).toBe(existing);
    expect(efiClient.createImmediateCharge).not.toHaveBeenCalled();
  });

  it('rejects invalid buyer for payment creation', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      buyerId: 'buyer-1',
      totalAmountCents: 1500,
      currency: 'BRL',
      expiresAt: null,
      status: OrderStatus.AWAITING_PAYMENT,
    });

    await expect(paymentsService.createPixChargeForOrder('order-1', 'buyer-2')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('fails when order is missing', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(paymentsService.createPixChargeForOrder('order-1', 'buyer-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('fails when order cannot be paid', async () => {
    (prismaService.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      buyerId: 'buyer-1',
      totalAmountCents: 1500,
      currency: 'BRL',
      expiresAt: null,
      status: OrderStatus.CANCELLED,
    });

    await expect(paymentsService.createPixChargeForOrder('order-1', 'buyer-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
