import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationType, PaymentStatus, Prisma } from '@prisma/client';

import { AppLogger } from '../logger/logger.service';
import { EmailQueueService } from '../email/email.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from '../request-context/request-context.service';
import { SettlementService } from '../settlement/settlement.service';
import { WebhooksJobName, WEBHOOKS_QUEUE } from './webhooks.queue';
import { WebhookMetricsService } from './webhooks.metrics';

type WebhookJobData = {
  webhookEventId: string;
  correlationId?: string;
};

@Processor(WEBHOOKS_QUEUE)
export class WebhooksProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly settlementService: SettlementService,
    private readonly logger: AppLogger,
    private readonly metrics: WebhookMetricsService,
    private readonly emailQueue: EmailQueueService,
    private readonly requestContext: RequestContextService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>) {
    if (job.name !== WebhooksJobName.ProcessEfi) {
      return;
    }
    await this.handleProcess(job);
  }

  async handleProcess(job: Job<WebhookJobData>) {
    const eventId = job.data.webhookEventId;
    let correlationId = job.data.correlationId ?? eventId;

    try {
      const requestId = job.id?.toString() ?? correlationId;
      await this.requestContext.run({ requestId, correlationId }, async () => {
        const result = await this.prisma.$transaction(async (tx) => {
          const event = await tx.webhookEvent.findUnique({
            where: { id: eventId },
          });

          if (!event) {
            return { status: 'missing' as const };
          }

          if (event.processedAt) {
            return { status: 'duplicate' as const, txid: event.txid };
          }

          const payload = event.payload as Prisma.JsonObject;
          const txid = event.txid ?? this.extractTxid(payload);
          correlationId = txid ?? event.id;

          if (!this.isPaidPayload(payload, event.eventType)) {
            await tx.webhookEvent.update({
              where: { id: event.id },
              data: { processedAt: new Date() },
            });
            return { status: 'ignored' as const, txid };
          }

          if (!txid) {
            throw new Error('Webhook payload missing txid.');
          }

          const payment = await tx.payment.findUnique({ where: { txid } });
          if (!payment) {
            throw new Error(`Payment not found for txid ${txid}`);
          }
          correlationId = txid ?? payment.orderId ?? event.id;

          const paidAt = this.extractPaidAt(payload);
          const paymentNeedsUpdate = payment.status !== PaymentStatus.CONFIRMED;

          const { order, applied } = await this.ordersService.applyPaymentConfirmation(
            payment.orderId,
            null,
            { source: 'system', reason: 'efi-webhook' },
            tx,
          );

          if (paymentNeedsUpdate) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: PaymentStatus.CONFIRMED,
                paidAt,
              },
            });
          }

          const orderDetails = await tx.order.findUnique({
            where: { id: order.id },
            include: { buyer: true, seller: true },
          });

          if (orderDetails?.sellerId) {
            await this.settlementService.createHeldEntry(
              {
                orderId: order.id,
                paymentId: payment.id,
                sellerId: orderDetails.sellerId,
                amountCents: payment.amountCents,
                currency: payment.currency,
              },
              tx,
            );
          } else if (orderDetails?.buyerId && !orderDetails?.sellerId) {
            // WALLET TOPUP
            const existingEntry = await tx.ledgerEntry.findFirst({
              where: {
                paymentId: payment.id,
                source: 'WALLET_TOPUP',
              },
            });

            if (!existingEntry) {
              await tx.ledgerEntry.create({
                data: {
                  userId: orderDetails.buyerId,
                  type: 'CREDIT',
                  state: 'AVAILABLE',
                  source: 'WALLET_TOPUP',
                  amountCents: payment.amountCents,
                  currency: payment.currency,
                  description: `Adição de saldo #${payment.id.slice(0, 8)}`,
                  orderId: order.id,
                  paymentId: payment.id,
                },
              });

              // Complete the order immediately for Top-up
              await tx.order.update({
                where: { id: order.id },
                data: { status: 'COMPLETED', completedAt: new Date() },
              });
            }
          }

          const shouldNotify = applied || paymentNeedsUpdate;

          if (shouldNotify && orderDetails?.buyerId) {
            await tx.notification.create({
              data: {
                userId: orderDetails.buyerId,
                type: NotificationType.PAYMENT,
                title: 'Pagamento confirmado',
                body: `Pedido ${orderDetails.id} confirmado.`,
              },
            });
          }

          if (shouldNotify && orderDetails?.sellerId) {
            await tx.notification.create({
              data: {
                userId: orderDetails.sellerId,
                type: NotificationType.PAYMENT,
                title: 'Venda paga',
                body: `Pedido ${orderDetails.id} confirmado pelo comprador.`,
              },
            });
          }

          let emailOutboxId: string | undefined;
          if (shouldNotify && orderDetails?.buyer?.email) {
            const outbox = await tx.emailOutbox.create({
              data: {
                to: orderDetails.buyer.email,
                subject: 'Pagamento confirmado',
                body: `Seu pedido ${orderDetails.id} foi confirmado e esta em entrega.`,
              },
            });
            emailOutboxId = outbox.id;
          }

          await tx.webhookEvent.update({
            where: { id: event.id },
            data: { processedAt: new Date(), paymentId: payment.id },
          });

          return { status: 'processed' as const, txid, order, applied, emailOutboxId };
        });

        this.requestContext.set({ correlationId });

        if (result.status === 'processed') {
          this.metrics.increment('processed', correlationId);
          this.logger.log('Webhook processed', this.buildContext(correlationId));
          if (result.applied) {
            await this.ordersService.handlePaymentSideEffects(result.order, null, {
              source: 'system',
              reason: 'efi-webhook',
            });
          }
          if (result.emailOutboxId) {
            await this.emailQueue.enqueueEmail(result.emailOutboxId);
          }
          return;
        }

        if (result.status === 'duplicate') {
          this.metrics.increment('duplicated', correlationId);
          this.logger.log('Webhook duplicated', this.buildContext(correlationId));
          return;
        }

        if (result.status === 'ignored') {
          this.metrics.increment('processed', correlationId);
          this.logger.log('Webhook ignored (not paid)', this.buildContext(correlationId));
          return;
        }

        this.metrics.increment('failed', correlationId);
        this.logger.warn('Webhook missing in database', this.buildContext(correlationId));
      });
    } catch (error) {
      this.metrics.increment('failed', correlationId);
      this.logger.error(
        error instanceof Error ? error.message : 'Webhook processing failed',
        error instanceof Error ? error.stack : undefined,
        this.buildContext(correlationId),
      );
      throw error;
    }
  }

  private isPaidPayload(payload: Prisma.JsonObject, eventType: string) {
    const normalizedType = eventType?.toLowerCase();
    if (normalizedType === 'pix') {
      return true;
    }
    const pix = payload['pix'];
    if (Array.isArray(pix) && pix.length > 0) {
      return true;
    }
    const status = payload['status'];
    if (typeof status === 'string') {
      const upper = status.toUpperCase();
      return ['CONCLUIDA', 'CONFIRMADA', 'LIQUIDADA', 'PAID', 'CONFIRMED'].includes(upper);
    }
    return false;
  }

  private extractTxid(payload: Prisma.JsonObject) {
    const direct = payload['txid'];
    if (typeof direct === 'string') {
      return direct;
    }
    const pix = payload['pix'];
    if (Array.isArray(pix) && pix.length > 0) {
      const txid = (pix[0] as Record<string, unknown>)?.['txid'];
      if (typeof txid === 'string') {
        return txid;
      }
    }
    const cob = payload['cob'] as Record<string, unknown> | undefined;
    if (cob && typeof cob['txid'] === 'string') {
      return cob['txid'];
    }
    return undefined;
  }

  private extractPaidAt(payload: Prisma.JsonObject) {
    const pix = payload['pix'];
    let raw = payload['dataHora'];
    if (Array.isArray(pix) && pix.length > 0) {
      const first = pix[0] as Record<string, unknown>;
      raw = first['horario'] ?? first['dataHora'] ?? raw;
    }
    if (typeof raw === 'string') {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  private buildContext(correlationId: string) {
    return `EfiWebhook:${correlationId}`;
  }
}
