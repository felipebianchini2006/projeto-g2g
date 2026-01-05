import { type RedisOptions } from 'ioredis';

export const ORDERS_QUEUE = 'orders';

export const OrdersJobName = {
  Expire: 'expire-order',
  AutoComplete: 'auto-complete-order',
} as const;

export const buildRedisConfig = (url: string): RedisOptions => ({
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(url ? { url } : {}),
});
