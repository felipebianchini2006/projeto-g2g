import { apiFetch } from './api-client';

export type PlatformSettings = {
  id: string;
  platformFeeBps: number;
  orderPaymentTtlSeconds: number;
  settlementReleaseDelayHours: number;
  splitEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UpdateSettingsInput = {
  platformFeeBps?: number;
  orderPaymentTtlSeconds?: number;
  settlementReleaseDelayHours?: number;
  splitEnabled?: boolean;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminSettingsApi = {
  getSettings: (token: string | null) =>
    apiFetch<PlatformSettings>('/admin/settings', { headers: authHeaders(token) }),

  updateSettings: (token: string | null, input: UpdateSettingsInput) =>
    apiFetch<PlatformSettings>('/admin/settings', {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),
};
