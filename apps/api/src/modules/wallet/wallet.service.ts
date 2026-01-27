import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerEntrySource,
  LedgerEntryState,
  LedgerEntryType,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PayoutDraftStatus,
  PayoutScope,
  PayoutStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from '../orders/orders.service';
import { OrdersQueueService } from '../orders/orders.queue.service';
import { SettlementService } from '../settlement/settlement.service';
import { TwilioVerifyService } from '../twilio/twilio-verify.service';
import { WalletEntriesQueryDto } from './dto/wallet-entries-query.dto';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { buildWalletSummary, type WalletSummaryRow } from './wallet.utils';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { PayOrderWithWalletDto } from './dto/pay-order-with-wallet.dto';
import type { EfiPixSendResponse } from '../payments/efi/efi.types';
const DEFAULT_TAKE = 20;

type AdminWalletSummary = {
  pendingCents: number;
  sellersAvailableCents: number;
  platformFeeCents: number;
  reversedCents: number;
};

type WalletEntryItem = {
  id: string;
  type: LedgerEntryType;
  state: LedgerEntryState;
  source: LedgerEntrySource;
  amountCents: number;
  currency: string;
  description: string | null;
  orderId: string | null;
  paymentId: string | null;
  availableAt: Date | null;
  createdAt: Date;
};

type CashOutPixResponse = EfiPixSendResponse | { status: string; idempotencyKey: string };

const resolveProviderRef = (response?: CashOutPixResponse | null) => {
  if (!response) {
    return null;
  }
  if ('endToEndId' in response && response.endToEndId) {
    return response.endToEndId;
  }
  if ('id' in response && response.id) {
    return response.id;
  }
  if ('idempotencyKey' in response && response.idempotencyKey) {
    return response.idempotencyKey;
  }
  return null;
};

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
    private readonly ordersQueue: OrdersQueueService,
    private readonly settlementService: SettlementService,
    private readonly twilioVerify: TwilioVerifyService,
  ) { }

  async getSummary(userId: string) {
    const rows = await this.prisma.ledgerEntry.groupBy({
      by: ['state', 'type', 'currency'],
      where: { userId },
      _sum: { amountCents: true },
    });

    return buildWalletSummary(rows as WalletSummaryRow[]);
  }

  async createTopupPix(userId: string, dto: TopupWalletDto) {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const order = await this.prisma.order.create({
      data: {
        buyerId: userId,
        sellerId: null, // Top-up has no seller
        totalAmountCents: dto.amountCents,
        currency: 'BRL',
        status: OrderStatus.CREATED,
        expiresAt,
        items: {
          create: [], // Top-up has no items
        },
      },
    });

    await this.ordersQueue.scheduleOrderExpiration(order.id, expiresAt);

    const payment = await this.paymentsService.createPixCharge(order, userId);

    return {
      orderId: order.id,
      payment,
    };
  }

  async payOrderWithBalance(
    userId: string,
    dto: PayOrderWithWalletDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: dto.orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Pedido não encontrado.');
      }

      if (order.buyerId !== userId) {
        throw new ForbiddenException('Apenas o comprador pode pagar com saldo da carteira.');
      }

      if (
        order.status !== OrderStatus.CREATED &&
        order.status !== OrderStatus.AWAITING_PAYMENT
      ) {
        throw new BadRequestException('Order cannot be paid with wallet balance.');
      }

      if (!order.totalAmountCents || order.totalAmountCents <= 0) {
        throw new BadRequestException('Order amount is invalid.');
      }

      if (!order.sellerId) {
        throw new BadRequestException('Order cannot be paid with wallet balance.');
      }

      const balanceRows = await tx.ledgerEntry.groupBy({
        by: ['type'],
        where: {
          userId,
          state: LedgerEntryState.AVAILABLE,
          currency: order.currency,
        },
        _sum: { amountCents: true },
      });

      const availableCents = balanceRows.reduce((total, row) => {
        const amount = row._sum.amountCents ?? 0;
        return total + (row.type === LedgerEntryType.DEBIT ? -amount : amount);
      }, 0);

      if (availableCents < order.totalAmountCents) {
        throw new BadRequestException('Saldo insuficiente para pagar o pedido.');
      }

      await tx.payment.updateMany({
        where: { orderId: order.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.EXPIRED },
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          payerId: userId,
          provider: PaymentProvider.WALLET,
          txid: `wallet-${randomUUID()}`,
          status: PaymentStatus.CONFIRMED,
          amountCents: order.totalAmountCents,
          currency: order.currency,
          paidAt: new Date(),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          orderId: order.id,
          paymentId: payment.id,
          type: LedgerEntryType.DEBIT,
          state: LedgerEntryState.AVAILABLE,
          source: LedgerEntrySource.WALLET_PAYMENT,
          amountCents: order.totalAmountCents,
          currency: order.currency,
          description: `Pagamento com saldo #${order.id.slice(0, 8)}`,
        },
      });

      const confirmation = await this.ordersService.applyPaymentConfirmation(
        order.id,
        userId,
        {
          source: 'user',
          reason: 'wallet-balance',
          ip: meta?.ip,
          userAgent: meta?.userAgent,
        },
        tx,
      );

      if (order.sellerId) {
        await this.settlementService.createHeldEntry(
          {
            orderId: order.id,
            paymentId: payment.id,
            sellerId: order.sellerId,
            amountCents: order.totalAmountCents,
            currency: order.currency,
          },
          tx,
        );
      }

      if (order.buyerId) {
        await tx.notification.create({
          data: {
            userId: order.buyerId,
            type: NotificationType.PAYMENT,
            title: 'Pagamento confirmado',
            body: `Pedido ${order.id} confirmado.`,
          },
        });
      }

      if (order.sellerId) {
        await tx.notification.create({
          data: {
            userId: order.sellerId,
            type: NotificationType.PAYMENT,
            title: 'Pagamento confirmado',
            body: `Pedido ${order.id} confirmado.`,
          },
        });
      }

      return {
        order: confirmation.order,
        applied: confirmation.applied,
        payment,
      };
    });

    if (result.applied) {
      await this.ordersService.handlePaymentSideEffects(result.order, userId, {
        source: 'user',
        reason: 'wallet-balance',
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
    }

    return { order: result.order, payment: result.payment };
  }

  async listEntries(userId: string, query: WalletEntriesQueryDto) {
    const where: Prisma.LedgerEntryWhereInput = { userId };

    if (query.source) {
      where.source = query.source;
    }

    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? DEFAULT_TAKE;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          type: true,
          state: true,
          source: true,
          amountCents: true,
          currency: true,
          description: true,
          orderId: true,
          paymentId: true,
          availableAt: true,
          createdAt: true,
        },
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return {
      items: items as WalletEntryItem[],
      total,
      skip,
      take,
    };
  }

  async getAdminSummary(): Promise<AdminWalletSummary> {
    const platformPayouts = await this.prisma.payout.aggregate({
      where: { scope: PayoutScope.PLATFORM, status: PayoutStatus.SENT },
      _sum: { amountCents: true },
    });
    const platformPaidCents = platformPayouts._sum.amountCents ?? 0;

    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        user: {
          role: UserRole.SELLER,
        },
      },
      select: {
        type: true,
        state: true,
        source: true,
        amountCents: true,
      },
    });

    const sumSigned = (amountCents: number, type: LedgerEntryType) =>
      type === LedgerEntryType.DEBIT ? -amountCents : amountCents;

    const summary: AdminWalletSummary = {
      pendingCents: 0,
      sellersAvailableCents: 0,
      platformFeeCents: 0,
      reversedCents: 0,
    };

    for (const entry of entries) {
      const signed = sumSigned(entry.amountCents, entry.type);
      if (entry.state === LedgerEntryState.HELD) {
        summary.pendingCents += signed;
      }
      if (entry.state === LedgerEntryState.AVAILABLE) {
        summary.sellersAvailableCents += signed;
      }
      if (entry.state === LedgerEntryState.REVERSED) {
        summary.reversedCents += signed;
      }
      if (entry.source === LedgerEntrySource.FEE) {
        summary.platformFeeCents += entry.amountCents;
      }
    }

    summary.platformFeeCents = Math.max(summary.platformFeeCents - platformPaidCents, 0);

    return summary;
  }

  async createUserPayout(
    userId: string,
    dto: CreatePayoutDto,
    meta?: { ip?: string; userAgent?: string | string[] },
  ) {
    const { summary, pixKey, beneficiaryName, feeCents } =
      await this.getUserPayoutContext(userId, dto);

    const payoutId = randomUUID();
    const description = `Saque carteira #${payoutId.slice(0, 8)}`;

    try {
      const response = await this.paymentsService.cashOutPix({
        orderId: payoutId,
        payoutPixKey: pixKey,
        amountCents: dto.amountCents, // Send the requested amount, not including fee
        currency: summary.currency,
      });

      return await this.prisma.$transaction(async (tx) => {
        const payout = await tx.payout.create({
          data: {
            id: payoutId,
            scope: PayoutScope.USER,
            status: PayoutStatus.SENT,
            userId,
            requestedById: userId,
            amountCents: dto.amountCents,
            currency: summary.currency,
            pixKey,
            pixKeyType: dto.pixKeyType,
            beneficiaryName,
            beneficiaryType: dto.beneficiaryType,
            payoutSpeed: dto.payoutSpeed,
            providerStatus: response?.status ?? null,
            providerRef: resolveProviderRef(response),
            requestIp: meta?.ip ?? null,
            requestUserAgent: Array.isArray(meta?.userAgent)
              ? meta?.userAgent.join('; ')
              : meta?.userAgent ?? null,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            userId,
            type: LedgerEntryType.DEBIT,
            state: LedgerEntryState.AVAILABLE,
            source: LedgerEntrySource.PAYOUT,
            amountCents: dto.amountCents,
            currency: summary.currency,
            description,
          },
        });

        if (feeCents > 0) {
          await tx.ledgerEntry.create({
            data: {
              userId,
              type: LedgerEntryType.DEBIT,
              state: LedgerEntryState.AVAILABLE,
              source: LedgerEntrySource.FEE,
              amountCents: feeCents,
              currency: summary.currency,
              description: `Taxa de saque imediato #${payoutId.slice(0, 8)}`,
            },
          });
        }

        return payout;
      });
    } catch (error) {
      await this.prisma.payout.create({
        data: {
          id: payoutId,
          scope: PayoutScope.USER,
          status: PayoutStatus.FAILED,
          userId,
          requestedById: userId,
          amountCents: dto.amountCents,
          currency: summary.currency,
          pixKey,
          pixKeyType: dto.pixKeyType,
          beneficiaryName,
          beneficiaryType: dto.beneficiaryType,
          payoutSpeed: dto.payoutSpeed,
          providerStatus: error instanceof Error ? error.message : null,
          requestIp: meta?.ip ?? null,
          requestUserAgent: Array.isArray(meta?.userAgent)
            ? meta?.userAgent.join('; ')
            : meta?.userAgent ?? null,
        },
      });
      throw error;
    }
  }

  async requestPayoutVerification(
    userId: string,
    dto: CreatePayoutDto & { useSmsFallback?: boolean },
  ) {
    const { user, summary } = await this.getUserPayoutContext(userId, dto);

    if (!user.email) {
      throw new BadRequestException('Email do usuario indisponivel.');
    }
    if (!user.phoneE164 || !user.phoneVerifiedAt) {
      throw new BadRequestException('Telefone nao verificado para saque.');
    }

    const phoneChannel = dto.useSmsFallback ? 'sms' : 'whatsapp';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const draft = await this.prisma.payoutDraft.create({
      data: {
        userId,
        payload: {
          amountCents: dto.amountCents,
          pixKey: dto.pixKey,
          pixKeyType: dto.pixKeyType ?? null,
          beneficiaryName: dto.beneficiaryName,
          beneficiaryType: dto.beneficiaryType ?? null,
          payoutSpeed: dto.payoutSpeed ?? null,
          phoneChannel,
          currency: summary.currency,
        },
        expiresAt,
      },
    });

    try {
      await Promise.all([
        this.twilioVerify.sendVerification(user.email, 'email'),
        this.twilioVerify.sendVerification(user.phoneE164, phoneChannel),
      ]);
    } catch (error) {
      await this.prisma.payoutDraft.update({
        where: { id: draft.id },
        data: { status: PayoutDraftStatus.EXPIRED },
      });
      throw error;
    }

    return {
      status: 'verificationRequired' as const,
      payoutDraftId: draft.id,
      expiresAt: draft.expiresAt,
    };
  }

  async confirmPayoutVerification(
    userId: string,
    dto: {
      payoutDraftId: string;
      codeEmail: string;
      codeWhatsapp?: string;
      codeSms?: string;
    },
    meta?: { ip?: string; userAgent?: string | string[] },
  ) {
    const draft = await this.prisma.payoutDraft.findUnique({
      where: { id: dto.payoutDraftId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneE164: true,
            phoneVerifiedAt: true,
            createdAt: true,
            payoutBlockedAt: true,
            payoutBlockedReason: true,
          },
        },
      },
    });

    if (!draft || draft.userId !== userId) {
      throw new NotFoundException('Rascunho de saque não encontrado.');
    }

    if (draft.status === PayoutDraftStatus.CONFIRMED) {
      throw new BadRequestException('Payout already confirmed.');
    }
    if (draft.status === PayoutDraftStatus.EXPIRED) {
      throw new BadRequestException('Payout verification expired.');
    }

    if (draft.expiresAt.getTime() <= Date.now()) {
      await this.prisma.payoutDraft.update({
        where: { id: draft.id },
        data: { status: PayoutDraftStatus.EXPIRED },
      });
      throw new BadRequestException('Payout verification expired.');
    }

    if (!draft.user?.email || !draft.user.phoneE164 || !draft.user.phoneVerifiedAt) {
      throw new BadRequestException('Missing verified contact.');
    }

    const payload = draft.payload as Prisma.JsonObject;
    const phoneChannel = payload['phoneChannel'] === 'sms' ? 'sms' : 'whatsapp';
    const phoneCode = phoneChannel === 'sms' ? dto.codeSms : dto.codeWhatsapp;
    if (!phoneCode) {
      throw new BadRequestException('Missing phone verification code.');
    }

    const [emailCheck, phoneCheck] = await Promise.all([
      this.twilioVerify.checkVerification(draft.user.email, dto.codeEmail),
      this.twilioVerify.checkVerification(draft.user.phoneE164, phoneCode),
    ]);

    if (emailCheck.status !== 'approved' || phoneCheck.status !== 'approved') {
      throw new ForbiddenException('Verificação falhou.');
    }

    const updated = await this.prisma.payoutDraft.updateMany({
      where: { id: draft.id, status: PayoutDraftStatus.PENDING },
      data: { status: PayoutDraftStatus.CONFIRMED },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Payout already used.');
    }

    const payoutDto: CreatePayoutDto = {
      amountCents: Number(payload['amountCents']),
      pixKey: String(payload['pixKey']),
      pixKeyType: (payload['pixKeyType'] as any) ?? undefined,
      beneficiaryName: String(payload['beneficiaryName']),
      beneficiaryType: (payload['beneficiaryType'] as any) ?? undefined,
      payoutSpeed: (payload['payoutSpeed'] as any) ?? undefined,
    };

    return this.createUserPayout(userId, payoutDto, meta);
  }

  private async getUserPayoutContext(userId: string, dto: CreatePayoutDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneE164: true,
        phoneVerifiedAt: true,
        createdAt: true,
        payoutBlockedAt: true,
        payoutBlockedReason: true,
      },
    });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }
    if (user.payoutBlockedAt) {
      throw new ForbiddenException(
        user.payoutBlockedReason || 'Payout is blocked for this account.',
      );
    }
    const accountAgeMs = Date.now() - user.createdAt.getTime();
    const minAgeMs = 5 * 24 * 60 * 60 * 1000;
    if (accountAgeMs < minAgeMs) {
      throw new ForbiddenException('Conta nova: saque liberado após 5 dias.');
    }

    const summary = await this.getSummary(userId);
    const pixKey = dto.pixKey.trim();
    const beneficiaryName = dto.beneficiaryName.trim();
    if (!pixKey) {
      throw new BadRequestException('Chave Pix obrigatoria.');
    }
    if (!beneficiaryName) {
      throw new BadRequestException('Nome do favorecido obrigatorio.');
    }
    const isInstant = dto.payoutSpeed === 'INSTANT';
    const feeCents = isInstant ? 100 : 0;

    if (dto.amountCents + feeCents > summary.availableCents) {
      throw new BadRequestException('Saldo insuficiente para saque (incluindo taxas).');
    }

    return { user, summary, pixKey, beneficiaryName, feeCents };
  }
  async createPlatformPayout(adminId: string, dto: CreatePayoutDto) {
    const pixKey = dto.pixKey.trim();
    const beneficiaryName = dto.beneficiaryName.trim();
    if (!pixKey) {
      throw new BadRequestException('Chave Pix obrigatoria.');
    }
    if (!beneficiaryName) {
      throw new BadRequestException('Nome do favorecido obrigatorio.');
    }
    const feeTotals = await this.prisma.ledgerEntry.aggregate({
      where: { source: LedgerEntrySource.FEE, state: LedgerEntryState.AVAILABLE },
      _sum: { amountCents: true },
    });
    const totalFees = feeTotals._sum.amountCents ?? 0;
    const paidTotals = await this.prisma.payout.aggregate({
      where: { scope: PayoutScope.PLATFORM, status: PayoutStatus.SENT },
      _sum: { amountCents: true },
    });
    const paid = paidTotals._sum.amountCents ?? 0;
    const available = Math.max(totalFees - paid, 0);

    if (dto.amountCents > available) {
      throw new BadRequestException('Saldo insuficiente para saque do site.');
    }

    const payoutId = randomUUID();
    try {
      const response = await this.paymentsService.cashOutPix({
        orderId: payoutId,
        payoutPixKey: pixKey,
        amountCents: dto.amountCents,
        currency: 'BRL',
      });

      return await this.prisma.payout.create({
        data: {
          id: payoutId,
          scope: PayoutScope.PLATFORM,
          status: PayoutStatus.SENT,
          requestedById: adminId,
          amountCents: dto.amountCents,
          currency: 'BRL',
          pixKey,
          pixKeyType: dto.pixKeyType,
          beneficiaryName,
          beneficiaryType: dto.beneficiaryType,
          payoutSpeed: dto.payoutSpeed,
          providerStatus: response?.status ?? null,
          providerRef: resolveProviderRef(response),
        },
      });
    } catch (error) {
      await this.prisma.payout.create({
        data: {
          id: payoutId,
          scope: PayoutScope.PLATFORM,
          status: PayoutStatus.FAILED,
          requestedById: adminId,
          amountCents: dto.amountCents,
          currency: 'BRL',
          pixKey,
          pixKeyType: dto.pixKeyType,
          beneficiaryName,
          beneficiaryType: dto.beneficiaryType,
          payoutSpeed: dto.payoutSpeed,
          providerStatus: error instanceof Error ? error.message : null,
        },
      });
      throw error;
    }
  }
}
