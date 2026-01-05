import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { Queue } from 'bullmq';

import { AppLogger } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { EfiClient } from '../payments/efi/efi-client.service';
import { WebhooksJobName, WEBHOOKS_QUEUE } from './webhooks.queue';
import { WebhookMetricsService } from './webhooks.metrics';

type WebhookPayload = Record<string, unknown>;

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLogger,
    private readonly metrics: WebhookMetricsService,
    private readonly efiClient: EfiClient,
    @InjectQueue(WEBHOOKS_QUEUE) private readonly queue: Queue,
  ) {}

  async registerEfiWebhook(payload: unknown) {
    const normalized = this.ensurePayload(payload);
    const txid = this.extractTxid(normalized);
    if (!txid && !this.extractPayloadId(normalized)) {
      throw new BadRequestException('Webhook payload missing txid.');
    }

    const bodyHash = this.hashPayload(normalized);
    const baseId = this.extractPayloadId(normalized) ?? txid ?? 'payload';
    const eventId = `${baseId}:${bodyHash}`;
    const eventType = this.extractEventType(normalized);
    const payloadWithHash = { ...normalized, _hash: bodyHash };

    try {
      const created = await this.prisma.webhookEvent.create({
        data: {
          provider: 'EFI',
          eventId,
          txid: txid ?? undefined,
          eventType,
          payload: payloadWithHash,
        },
      });

      await this.enqueueProcessing(created.id, created.eventId);
      this.metrics.increment('received', txid ?? created.id);
      this.logger.log('Webhook received', this.buildContext(txid, created.id));
      return { id: created.id, eventId: created.eventId };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.metrics.increment('duplicated', txid ?? eventId);
        const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId } });
        if (existing && !existing.processedAt) {
          await this.enqueueProcessing(existing.id, existing.eventId);
        }
        this.logger.log('Webhook duplicated', this.buildContext(txid, existing?.id ?? eventId));
        return { duplicate: true };
      }
      throw error;
    }
  }

  async registerEfiWebhookEndpoint(webhookUrl: string) {
    return this.efiClient.registerWebhook(webhookUrl);
  }

  async getMetrics() {
    const counters = this.metrics.snapshot();
    const [pending, processed, total] = await this.prisma.$transaction([
      this.prisma.webhookEvent.count({ where: { processedAt: null } }),
      this.prisma.webhookEvent.count({ where: { processedAt: { not: null } } }),
      this.prisma.webhookEvent.count(),
    ]);

    return {
      counters,
      pending,
      processed,
      total,
    };
  }

  private async enqueueProcessing(webhookEventId: string, eventId: string) {
    try {
      await this.queue.add(
        WebhooksJobName.ProcessEfi,
        { webhookEventId },
        {
          jobId: `efi:${eventId}`,
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

  private ensurePayload(payload: unknown): WebhookPayload {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Webhook payload must be an object.');
    }
    return payload as WebhookPayload;
  }

  private extractPayloadId(payload: WebhookPayload) {
    const candidate =
      payload['id'] ??
      payload['eventId'] ??
      payload['webhookId'] ??
      payload['endToEndId'];
    return typeof candidate === 'string' ? candidate : undefined;
  }

  private extractTxid(payload: WebhookPayload) {
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

  private extractEventType(payload: WebhookPayload) {
    const candidate = payload['evento'] ?? payload['eventType'] ?? payload['type'];
    if (typeof candidate === 'string') {
      return candidate;
    }
    if (Array.isArray(payload['pix'])) {
      return 'pix';
    }
    return 'unknown';
  }

  private hashPayload(payload: WebhookPayload) {
    const canonical = this.stableStringify(payload);
    return createHash('sha256').update(canonical).digest('hex');
  }

  private stableStringify(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`);
    return `{${pairs.join(',')}}`;
  }

  private buildContext(txid?: string | null, fallback?: string) {
    const correlationId = txid ?? fallback ?? 'unknown';
    return `EfiWebhook:${correlationId}`;
  }
}
