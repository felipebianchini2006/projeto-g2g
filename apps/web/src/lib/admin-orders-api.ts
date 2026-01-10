import { apiFetch } from './api-client';

export type AdminOrderActionResponse = {
  status: string;
  orderId: string;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminOrdersApi = {
  releaseOrder: (token: string | null, orderId: string, reason?: string) =>
    apiFetch<AdminOrderActionResponse>(`/admin/orders/${orderId}/release`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    }),

  refundOrder: (token: string | null, orderId: string, reason?: string) =>
    apiFetch<AdminOrderActionResponse>(`/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    }),
};
