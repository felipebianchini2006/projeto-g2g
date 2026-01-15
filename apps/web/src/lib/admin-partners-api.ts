import { apiFetch } from './api-client';

export type Partner = {
  id: string;
  name: string;
  slug: string;
  commissionBps: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PartnerStats = {
  partnerId: string;
  clicks: number;
  orders: number;
  commissionCents: number;
};

export type PartnerPayload = {
  name: string;
  slug: string;
  commissionBps?: number;
  active?: boolean;
};

export type PartnerUpdatePayload = Partial<PartnerPayload>;

const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminPartnersApi = {
  listPartners: (token: string | null) =>
    apiFetch<Partner[]>('/admin/partners', { headers: authHeaders(token) }),

  createPartner: (token: string | null, payload: PartnerPayload) =>
    apiFetch<Partner>('/admin/partners', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  updatePartner: (token: string | null, partnerId: string, payload: PartnerUpdatePayload) =>
    apiFetch<Partner>(`/admin/partners/${partnerId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  getStats: (token: string | null, partnerId: string) =>
    apiFetch<PartnerStats>(`/admin/partners/${partnerId}/stats`, {
      headers: authHeaders(token),
    }),

  deletePartner: (token: string | null, partnerId: string) =>
    apiFetch<{ success: boolean }>(`/admin/partners/${partnerId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
};
