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

    let verificationMismatch: { orderId: string } | null = null;
    let skipNotifications = false;

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
            const verificationUser = await tx.user.findFirst({
              where: { verificationFeeOrderId: order.id },
              select: { id: true, verificationFeePaidAt: true, fullName: true, cpf: true },
            });

            if (verificationUser) {
              const payer = this.extractPayerData(payload);
              const matched = this.isVerificationPayerMatch(verificationUser, payer);

              if (!matched) {
                await tx.user.update({
                  where: { id: verificationUser.id },
                  data: { verificationFeeOrderId: null },
                });
                verificationMismatch = { orderId: order.id };
                skipNotifications = true;
              } else {
                if (!verificationUser.verificationFeePaidAt) {
                  await tx.user.update({
                    where: { id: verificationUser.id },
                    data: {
                      verificationFeePaidAt: paidAt ?? new Date(),
                      verificationFeeOrderId: null,
                    },
                  });
                }

                await tx.order.update({
                  where: { id: order.id },
                  data: { status: 'COMPLETED', completedAt: new Date() },
                });
              }
            } else {
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
                    description: `Adi????o de saldo #${payment.id.slice(0, 8)}`,
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
          }

          const shouldNotify = (applied || paymentNeedsUpdate) && !skipNotifications;

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
          if (verificationMismatch) {
            try {
              await this.settlementService.refundOrder(
                verificationMismatch.orderId,
                null,
                'verification-fee-mismatch',
              );
            } catch (error) {
              this.logger.error(
                error instanceof Error ? error.message : 'Refund failed',
                error instanceof Error ? error.stack : undefined,
                this.buildContext(correlationId),
              );
            }
          } else if (result.applied) {
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

  private extractPayerData(payload: Prisma.JsonObject) {
    const pix = payload['pix'];
    const first =
      Array.isArray(pix) && pix.length > 0 ? (pix[0] as Record<string, unknown>) : undefined;
    const direct = (payload['pagador'] ?? payload['devedor']) as
      | Record<string, unknown>
      | undefined;
    const nested = (first?.['pagador'] ?? first?.['devedor']) as
      | Record<string, unknown>
      | undefined;

    const cpfRaw =
      (nested?.['cpf'] as string | undefined) ??
      (direct?.['cpf'] as string | undefined) ??
      (first?.['cpf'] as string | undefined) ??
      (payload['cpf'] as string | undefined);
    const nameRaw =
      (nested?.['nome'] as string | undefined) ??
      (direct?.['nome'] as string | undefined) ??
      (first?.['nome'] as string | undefined) ??
      (payload['nome'] as string | undefined);

    return {
      cpf: cpfRaw,
      name: nameRaw,
    };
  }

  private normalizeDigits(value?: string | null) {
    if (!value) return '';
    return value.replace(/\D/g, '');
  }

  private normalizeName(value?: string | null) {
    if (!value) return '';
    return value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^A-Za-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  private countWords(value?: string | null) {
    const normalized = this.normalizeName(value);
    if (!normalized) return 0;
    return normalized.split(' ').filter(Boolean).length;
  }

  private isVerificationPayerMatch(
    user: { fullName: string | null; cpf: string | null },
    payer: { cpf?: string; name?: string },
  ) {
    const userCpf = this.normalizeDigits(user.cpf);
    const payerCpf = this.normalizeDigits(payer.cpf);
    if (payerCpf) {
      return payerCpf.length > 0 && payerCpf === userCpf;
    }

    const payerName = this.normalizeName(payer.name ?? null);
    const userName = this.normalizeName(user.fullName ?? null);
    if (!payerName || !userName) {
      return false;
    }

    const payerWords = this.countWords(payer.name ?? null);
    const userWords = this.countWords(user.fullName ?? null);
    if (payerWords < userWords) {
      return false;
    }

    return payerName === userName;
  }

  private buildContext(correlationId: string) {
    return `EfiWebhook:${correlationId}`;
  }
}
