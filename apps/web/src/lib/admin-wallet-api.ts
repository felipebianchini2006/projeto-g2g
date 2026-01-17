import { apiFetch } from './api-client';

export type AdminWalletSummary = {
  pendingCents: number;
  sellersAvailableCents: number;
  platformFeeCents: number;
  reversedCents: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminWalletApi = {
  getSummary: (token: string | null) =>
    apiFetch<AdminWalletSummary>('/admin/wallet/summary', {
      headers: authHeaders(token),
    }),
};
