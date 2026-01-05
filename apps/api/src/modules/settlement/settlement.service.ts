import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import {
  AuditAction,
  LedgerEntryStatus,
  LedgerEntryType,
  NotificationType,
  OrderEventType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';

import { AppLogger } from '../logger/logger.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementJobName, SETTLEMENT_QUEUE } from './settlement.queue';

type SettlementMeta = {
  reason?: string;
  source?: 'system' | 'admin';
};

type HeldEntryInput = {
  orderId: string;
  paymentId: string;
  sellerId: string;
  amountCents: number;
  currency: string;
};

type SellerPayoutInfo = {
  payoutPixKey?: string | null;
  payoutBlockedAt?: Date | null;
  email?: string | null;
};

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
    private readonly paymentsService: PaymentsService,
    @InjectQueue(SETTLEMENT_QUEUE) private readonly queue: Queue,
  ) {}

  async scheduleRelease(orderId: string, delayMs?: number) {
    const delayHours =
      this.configService.get<number>('SETTLEMENT_RELEASE_DELAY_HOURS') ?? 0;
    const delay = delayMs ?? delayHours * 60 * 60 * 1000;
    try {
      await this.queue.add(
        SettlementJobName.ReleaseOrder,
        { orderId },
        {
          jobId: `release-${orderId}`,
          delay: Math.max(delay, 0),
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('Job already exists')) {
        return;
      }
      throw error;
    }
  }

  async createHeldEntry(
    input: HeldEntryInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    const existing = await client.ledgerEntry.findFirst({
      where: {
        orderId: input.orderId,
        paymentId: input.paymentId,
        type: LedgerEntryType.HELD,
      },
    });

    if (existing) {
      return existing;
    }

    return client.ledgerEntry.create({
      data: {
        userId: input.sellerId,
        orderId: input.orderId,
        paymentId: input.paymentId,
        type: LedgerEntryType.HELD,
        status: LedgerEntryStatus.POSTED,
        amountCents: input.amountCents,
        currency: input.currency,
        description: 'Escrow held after payment confirmation.',
      },
    });
  }

  async releaseOrder(orderId: string, actorId?: string | null, reason?: string) {
    const context = this.buildContext(orderId);
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
          seller: true,
          dispute: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found.');
      }
      if (order.status !== OrderStatus.COMPLETED) {
        throw new BadRequestException('Order is not completed.');
      }
      if (order.dispute) {
        throw new BadRequestException('Order is disputed.');
      }

      const payment = order.payments[0];
      if (!payment) {
        throw new BadRequestException('Payment not found for order.');
      }

      const existingRelease = await tx.ledgerEntry.findFirst({
        where: {
          orderId: order.id,
          type: { in: [LedgerEntryType.AVAILABLE, LedgerEntryType.RELEASED] },
        },
      });
      if (existingRelease) {
        return { status: 'already_released' as const, order, payment };
      }

      const heldEntry = await tx.ledgerEntry.findFirst({
        where: {
          orderId: order.id,
          paymentId: payment.id,
          type: LedgerEntryType.HELD,
        },
      });
      if (!heldEntry) {
        throw new BadRequestException('Held balance not found.');
      }

      return { status: 'pending_release' as const, order, payment, heldEntry };
    });

    if (result.status === 'already_released') {
      return { status: 'already_released', orderId };
    }

    const settlementMode =
      this.configService.get<string>('SETTLEMENT_MODE') ?? 'cashout';

    if (settlementMode === 'cashout') {
      const seller = result.order.seller as SellerPayoutInfo | null | undefined;
      if (!seller?.payoutPixKey) {
        throw new BadRequestException('Seller payout Pix key not configured.');
      }
      if (seller.payoutBlockedAt) {
        throw new ForbiddenException('Seller payout is blocked.');
      }
      await this.paymentsService.cashOutPix({
        orderId: result.order.id,
        payoutPixKey: seller.payoutPixKey,
        amountCents: result.heldEntry.amountCents,
        currency: result.heldEntry.currency,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const existingRelease = await tx.ledgerEntry.findFirst({
        where: {
          orderId: result.order.id,
          type: { in: [LedgerEntryType.AVAILABLE, LedgerEntryType.RELEASED] },
        },
      });
      if (existingRelease) {
        return;
      }

      await tx.ledgerEntry.create({
        data: {
          userId: result.heldEntry.userId,
          orderId: result.order.id,
          paymentId: result.payment.id,
          type: LedgerEntryType.RELEASED,
          status: LedgerEntryStatus.POSTED,
          amountCents: result.heldEntry.amountCents,
          currency: result.heldEntry.currency,
          description: 'Escrow released after completion.',
        },
      });

      await tx.ledgerEntry.create({
        data: {
          userId: result.heldEntry.userId,
          orderId: result.order.id,
          paymentId: result.payment.id,
          type: LedgerEntryType.AVAILABLE,
          status: LedgerEntryStatus.POSTED,
          amountCents: result.heldEntry.amountCents,
          currency: result.heldEntry.currency,
          description: 'Balance available after release.',
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: result.order.id,
          ...(actorId ? { user: { connect: { id: actorId } } } : {}),
          type: OrderEventType.NOTE,
          metadata: this.buildMetadata(
            { source: actorId ? 'admin' : 'system', reason },
            OrderStatus.COMPLETED,
            OrderStatus.COMPLETED,
            { action: 'release' },
          ),
        },
      });

      if (actorId) {
        await tx.auditLog.create({
          data: {
            adminId: actorId,
            action: AuditAction.MANUAL_ADJUSTMENT,
            entityType: 'Order',
            entityId: result.order.id,
            payload: {
              action: 'release',
              reason,
              settlementMode,
            },
          },
        });
      }

      if (result.order.sellerId) {
        await tx.notification.create({
          data: {
            userId: result.order.sellerId,
            type: NotificationType.PAYMENT,
            title: 'Saldo liberado',
            body: `Pedido ${result.order.id} liberado para saque.`,
          },
        });
      }

      const seller = result.order.seller as SellerPayoutInfo | null | undefined;
      if (seller?.email) {
        await tx.emailOutbox.create({
          data: {
            to: seller.email,
            subject: 'Saldo liberado',
            body: `O pedido ${result.order.id} foi liberado para saque.`,
          },
        });
      }
    });

    this.logger.log(
      `Settlement released (${settlementMode})`,
      context,
    );

    return { status: 'released', orderId };
  }

  async refundOrder(orderId: string, actorId?: string | null, reason?: string) {
    const context = this.buildContext(orderId);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        buyer: true,
        seller: true,
        dispute: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (actorId && order.buyerId === actorId) {
      throw new ForbiddenException('Only admins can refund orders.');
    }

    const payment = order.payments[0];
    if (!payment) {
      throw new BadRequestException('Payment not found for order.');
    }

    const releaseExists = await this.prisma.ledgerEntry.findFirst({
      where: {
        orderId: order.id,
        type: { in: [LedgerEntryType.AVAILABLE, LedgerEntryType.RELEASED] },
      },
    });

    if (releaseExists) {
      await this.handleChargebackManual(order, payment, actorId, reason);
      this.logger.warn('Chargeback manual required', context);
      return { status: 'chargeback_manual', orderId };
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      return { status: 'already_refunded', orderId };
    }

    const e2eId = await this.findEndToEndId(payment.txid);
    await this.paymentsService.refundPix({
      paymentId: payment.id,
      txid: payment.txid,
      e2eId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      reason: reason ?? 'refund',
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.REFUNDED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: updatedOrder.id,
          ...(actorId ? { user: { connect: { id: actorId } } } : {}),
          type: OrderEventType.REFUNDED,
          metadata: this.buildMetadata(
            { source: actorId ? 'admin' : 'system', reason },
            order.status,
            OrderStatus.REFUNDED,
          ),
        },
      });

      if (actorId) {
        await tx.auditLog.create({
          data: {
            adminId: actorId,
            action: AuditAction.REFUND,
            entityType: 'Order',
            entityId: updatedOrder.id,
            payload: { reason, source: 'settlement' },
          },
        });
      }

      await tx.ledgerEntry.create({
        data: {
          userId: order.sellerId ?? order.buyerId,
          orderId: order.id,
          paymentId: payment.id,
          type: LedgerEntryType.REVERSED,
          status: LedgerEntryStatus.POSTED,
          amountCents: payment.amountCents,
          currency: payment.currency,
          description: 'Refund processed while funds held.',
        },
      });

      if (order.buyerId) {
        await tx.notification.create({
          data: {
            userId: order.buyerId,
            type: NotificationType.PAYMENT,
            title: 'Reembolso solicitado',
            body: `Pedido ${order.id} reembolsado.`,
          },
        });
      }

      if (order.buyer?.email) {
        await tx.emailOutbox.create({
          data: {
            to: order.buyer.email,
            subject: 'Reembolso concluido',
            body: `Seu pedido ${order.id} foi reembolsado.`,
          },
        });
      }
    });

    this.logger.log('Refund processed', context);
    return { status: 'refunded', orderId };
  }

  private async handleChargebackManual(
    order: { id: string; sellerId: string | null; buyerId: string; status: OrderStatus },
    payment: { id: string; amountCents: number; currency: string },
    actorId?: string | null,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { orderId: order.id },
      });

      const ticketId = ticket?.id ?? randomUUID();
      if (!ticket) {
        await tx.ticket.create({
          data: {
            id: ticketId,
            orderId: order.id,
            openedById: actorId ?? order.buyerId,
            status: 'OPEN',
            subject: `Chargeback manual do pedido ${order.id}`,
            messages: {
              create: [
                {
                  senderId: actorId ?? order.buyerId,
                  message: reason ?? 'Chargeback manual necessario apos liberacao.',
                },
              ],
            },
          },
        });
      } else {
        await tx.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            senderId: actorId ?? order.buyerId,
            message: reason ?? 'Chargeback manual necessario apos liberacao.',
          },
        });
      }

      if (order.sellerId) {
        await tx.user.update({
          where: { id: order.sellerId },
          data: {
            payoutBlockedAt: new Date(),
            payoutBlockedReason: reason ?? 'Manual chargeback required.',
          } as Prisma.UserUncheckedUpdateInput,
        });
      }

      await tx.ledgerEntry.create({
        data: {
          userId: order.sellerId ?? order.buyerId,
          orderId: order.id,
          paymentId: payment.id,
          type: LedgerEntryType.REVERSED,
          status: LedgerEntryStatus.PENDING,
          amountCents: payment.amountCents,
          currency: payment.currency,
          description: 'Manual chargeback required after release.',
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.REFUNDED },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          ...(actorId ? { user: { connect: { id: actorId } } } : {}),
          type: OrderEventType.REFUNDED,
          metadata: this.buildMetadata(
            { source: actorId ? 'admin' : 'system', reason },
            order.status,
            OrderStatus.REFUNDED,
            { chargeback: 'manual' },
          ),
        },
      });

      if (actorId) {
        await tx.auditLog.create({
          data: {
            adminId: actorId,
            action: AuditAction.REFUND,
            entityType: 'Order',
            entityId: order.id,
            payload: { reason, source: 'chargeback-manual' },
          },
        });
      }

      if (order.sellerId) {
        await tx.notification.create({
          data: {
            userId: order.sellerId,
            type: NotificationType.PAYMENT,
            title: 'Chargeback manual',
            body: `Pedido ${order.id} exige chargeback manual.`,
          },
        });
      }
    });
  }

  private async findEndToEndId(txid: string) {
    const event = await this.prisma.webhookEvent.findFirst({
      where: { txid, provider: 'EFI' },
      orderBy: { createdAt: 'desc' },
    });
    if (!event) {
      return undefined;
    }
    const payload = event.payload as Prisma.JsonObject;
    const pix = payload['pix'];
    if (Array.isArray(pix) && pix.length > 0) {
      const first = pix[0] as Record<string, unknown>;
      const e2e =
        first['endToEndId'] ??
        first['endToEndID'] ??
        first['e2eid'] ??
        first['e2eId'];
      if (typeof e2e === 'string') {
        return e2e;
      }
    }
    const direct = payload['endToEndId'] ?? payload['e2eid'];
    if (typeof direct === 'string') {
      return direct;
    }
    return undefined;
  }

  private buildMetadata(
    meta: SettlementMeta,
    from: OrderStatus,
    to: OrderStatus,
    extra?: Record<string, unknown>,
  ): Prisma.InputJsonValue {
    return {
      from,
      to,
      reason: meta.reason,
      source: meta.source ?? 'system',
      ...(extra ?? {}),
    };
  }

  private buildContext(orderId: string) {
    return `Settlement:${orderId}`;
  }
}
