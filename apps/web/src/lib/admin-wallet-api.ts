import { apiFetch } from './api-client';

export type AdminWalletSummary = {
  pendingCents: number;
  sellersAvailableCents: number;
  platformFeeCents: number;
  reversedCents: number;
};

export type AdminPayoutPayload = {
  amountCents: number;
  pixKey: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
  beneficiaryName: string;
  beneficiaryType?: 'PF' | 'PJ';
  payoutSpeed?: 'NORMAL' | 'INSTANT';
};

export type AdminPayoutResponse = {
  id: string;
  status: 'SENT' | 'FAILED';
  amountCents: number;
  currency: string;
  pixKey: string;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminWalletApi = {
  getSummary: (token: string | null) =>
    apiFetch<AdminWalletSummary>('/admin/wallet/summary', {
      headers: authHeaders(token),
    }),
  createPayout: (token: string | null, payload: AdminPayoutPayload) =>
    apiFetch<AdminPayoutResponse>('/admin/wallet/payouts', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
};
