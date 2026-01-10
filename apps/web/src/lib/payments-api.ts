import { apiFetch } from './api-client';

export type PixPayment = {
  id: string;
  orderId: string;
  provider?: string;
  txid: string;
  status: string;
  amountCents: number;
  currency: string;
  qrCode?: string | null;
  copyPaste?: string | null;
  expiresAt?: string | null;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const paymentsApi = {
  createPix: (token: string | null, orderId: string) =>
    apiFetch<PixPayment>('/payments/pix/create', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ orderId }),
    }),
};
