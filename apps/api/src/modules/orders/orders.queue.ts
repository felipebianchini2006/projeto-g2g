import { type ConnectionOptions } from 'bullmq';

export const ORDERS_QUEUE = 'orders';

export const OrdersJobName = {
  Expire: 'expire-order',
  AutoComplete: 'auto-complete-order',
} as const;

export const buildRedisConfig = (url: string): ConnectionOptions => ({
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(url ? { url } : {}),
});
