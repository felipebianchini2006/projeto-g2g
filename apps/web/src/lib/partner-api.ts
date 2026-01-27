import { apiFetch } from './api-client';

export type Partner = {
  id: string;
  name: string;
  slug: string;
  commissionBps: number;
  active: boolean;
  ownerUserId?: string | null;
  ownerEmail?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerCoupon = {
  id: string;
  code: string;
  active: boolean;
  usesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PartnerStats = {
  partnerId: string;
  clicks: number;
  orders: number;
  earnedCents: number;
  reversedCents: number;
  paidCents: number;
  commissionCents: number;
  balanceCents: number;
  coupons: PartnerCoupon[];
};

export type PartnerPayoutRequest = {
  amountCents: number;
  pixKey: string;
  pixKeyType: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
};

const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const partnerApi = {
  listMine: (token: string | null) =>
    apiFetch<Partner[]>('/partner/me', { headers: authHeaders(token) }, '/api/proxy'),

  getStats: (token: string | null, partnerId: string) =>
    apiFetch<PartnerStats>(`/partner/me/${partnerId}/stats`, {
      headers: authHeaders(token),
    }, '/api/proxy'),

  requestPayout: (token: string | null, partnerId: string, payload: PartnerPayoutRequest) =>
    apiFetch(`/partner/me/${partnerId}/payouts/request`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }, '/api/proxy'),
};
