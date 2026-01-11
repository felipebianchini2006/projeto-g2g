import { Injectable } from '@nestjs/common';

type RateState = {
  windowStart: number;
  lastMessageAt: number;
  count: number;
};

type RateLimitResult = {
  allowed: boolean;
  reason?: string;
  retryAfterMs?: number;
};

@Injectable()
export class SupportChatRateLimiter {
  private readonly windowMs = 60_000;
  private readonly maxMessages = 20;
  private readonly minIntervalMs = 750;
  private readonly entries = new Map<string, RateState>();

  check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = this.entries.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      entry = { windowStart: now, lastMessageAt: 0, count: 0 };
    }

    if (entry.lastMessageAt && now - entry.lastMessageAt < this.minIntervalMs) {
      return {
        allowed: false,
        reason: 'Slow down.',
        retryAfterMs: this.minIntervalMs - (now - entry.lastMessageAt),
      };
    }

    if (entry.count >= this.maxMessages) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded.',
        retryAfterMs: entry.windowStart + this.windowMs - now,
      };
    }

    entry.count += 1;
    entry.lastMessageAt = now;
    this.entries.set(key, entry);

    return { allowed: true };
  }
}
