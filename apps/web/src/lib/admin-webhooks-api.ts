import { apiFetch } from './api-client';

export type WebhookMetrics = {
  counters: Record<string, number>;
  pending: number;
  processed: number;
  total: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminWebhooksApi = {
  registerEfiWebhook: (token: string | null) =>
    apiFetch<{ success?: boolean }>('/webhooks/efi/register', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({}),
    }),

  fetchEfiMetrics: (token: string | null) =>
    apiFetch<WebhookMetrics>('/webhooks/efi/metrics', {
      headers: authHeaders(token),
    }),
};
