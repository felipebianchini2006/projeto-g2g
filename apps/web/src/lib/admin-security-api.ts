import { apiFetch } from './api-client';

export type AdminSecurityUser = {
  id: string;
  email: string;
  fullName?: string | null;
  cpf?: string | null;
  payoutBlockedAt?: string | null;
  payoutBlockedReason?: string | null;
  blockedAt?: string | null;
  blockedUntil?: string | null;
  blockedReason?: string | null;
  createdAt?: string;
};

export type AdminSecurityPayout = {
  id: string;
  status: 'SENT' | 'FAILED';
  amountCents: number;
  currency: string;
  pixKey: string;
  pixKeyType?: string | null;
  beneficiaryName: string;
  beneficiaryType?: string | null;
  payoutSpeed?: string | null;
  providerStatus?: string | null;
  providerRef?: string | null;
  requestIp?: string | null;
  requestUserAgent?: string | null;
  createdAt: string;
  userId?: string | null;
  user?: AdminSecurityUser | null;
  payoutCount: number;
  cpfUsedBefore: boolean;
};

export type AdminSecurityPayoutsResponse = {
  items: AdminSecurityPayout[];
  total: number;
  skip: number;
  take: number;
};

export type AdminSecurityPayoutsQuery = {
  skip?: number;
  take?: number;
};

export type AdminBalanceAdjustPayload = {
  amountCents: number;
  reason: string;
};

export type AdminUserBlockPayload = {
  reason: string;
  durationDays: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const buildQuery = (query?: AdminSecurityPayoutsQuery) => {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  if (typeof query.skip === 'number') {
    params.set('skip', String(query.skip));
  }
  if (typeof query.take === 'number') {
    params.set('take', String(query.take));
  }
  const value = params.toString();
  return value ? `?${value}` : '';
};

export const adminSecurityApi = {
  listPayouts: (token: string | null, query?: AdminSecurityPayoutsQuery) =>
    apiFetch<AdminSecurityPayoutsResponse>(`/admin/security/payouts${buildQuery(query)}`, {
      headers: authHeaders(token),
      skipGlobalError: true,
    }),

  adjustBalance: (token: string | null, userId: string, payload: AdminBalanceAdjustPayload) =>
    apiFetch(`/admin/security/users/${userId}/balance-adjust`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
      skipGlobalError: true,
    }),

  blockPayouts: (token: string | null, userId: string, reason: string) =>
    apiFetch(`/admin/security/users/${userId}/payout-block`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
      skipGlobalError: true,
    }),

  unblockPayouts: (token: string | null, userId: string) =>
    apiFetch(`/admin/security/users/${userId}/payout-unblock`, {
      method: 'POST',
      headers: authHeaders(token),
      skipGlobalError: true,
    }),

  blockUser: (token: string | null, userId: string, payload: AdminUserBlockPayload) =>
    apiFetch(`/admin/security/users/${userId}/block`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
      skipGlobalError: true,
    }),

  unblockUser: (token: string | null, userId: string) =>
    apiFetch(`/admin/security/users/${userId}/unblock`, {
      method: 'POST',
      headers: authHeaders(token),
      skipGlobalError: true,
    }),
};
