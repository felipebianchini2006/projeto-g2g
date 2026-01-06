import { apiFetch } from './api-client';

export type DisputeStatus = 'OPEN' | 'REVIEW' | 'RESOLVED' | 'REJECTED';

export type Dispute = {
  id: string;
  ticketId: string;
  orderId: string;
  status: DisputeStatus;
  reason: string;
  resolution?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  order?: {
    id: string;
    status: string;
    createdAt: string;
    buyerId: string;
    sellerId?: string | null;
  } | null;
  ticket?: {
    id: string;
    subject: string;
    status: string;
  } | null;
};

export type ResolveDisputeInput = {
  action: 'refund' | 'release' | 'partial';
  reason?: string;
  amountCents?: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const disputesApi = {
  listDisputes: (token: string | null, status?: DisputeStatus) =>
    apiFetch<Dispute[]>(
      status ? `/admin/disputes?status=${encodeURIComponent(status)}` : '/admin/disputes',
      { headers: authHeaders(token) },
    ),

  getDispute: (token: string | null, disputeId: string) =>
    apiFetch<Dispute>(`/admin/disputes/${disputeId}`, { headers: authHeaders(token) }),

  resolveDispute: (token: string | null, disputeId: string, input: ResolveDisputeInput) =>
    apiFetch<{ status: string; disputeId: string }>(`/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),
};
