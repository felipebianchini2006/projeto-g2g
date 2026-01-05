import { Injectable } from '@nestjs/common';

import { AppLogger } from '../logger/logger.service';

type WebhookMetricKey = 'processed' | 'duplicated' | 'failed' | 'received';

@Injectable()
export class WebhookMetricsService {
  private readonly counters: Record<WebhookMetricKey, number> = {
    processed: 0,
    duplicated: 0,
    failed: 0,
    received: 0,
  };

  constructor(private readonly logger: AppLogger) {}

  increment(metric: WebhookMetricKey, correlationId?: string) {
    this.counters[metric] += 1;
    this.logger.debug(
      `Webhook metric incremented: ${metric}=${this.counters[metric]}`,
      correlationId ? `WebhookMetrics:${correlationId}` : 'WebhookMetrics',
    );
  }

  snapshot() {
    return { ...this.counters };
  }
}
