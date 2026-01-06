import { apiFetch } from './api-client';

export type AdminListingStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'SUSPENDED';

export type AdminListing = {
  id: string;
  sellerId: string;
  categoryId: string;
  title: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  status: AdminListingStatus;
  deliveryType: 'AUTO' | 'MANUAL';
  deliverySlaHours: number;
  refundPolicy: string;
  createdAt: string;
  updatedAt: string;
  seller?: {
    id: string;
    email: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type AdminDecisionInput = {
  reason?: string;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminListingsApi = {
  listListings: (token: string | null, status?: AdminListingStatus) =>
    apiFetch<AdminListing[]>(
      status ? `/admin/listings?status=${encodeURIComponent(status)}` : '/admin/listings',
      { headers: authHeaders(token) },
    ),

  approveListing: (token: string | null, listingId: string) =>
    apiFetch<AdminListing>(`/admin/listings/${listingId}/approve`, {
      method: 'POST',
      headers: authHeaders(token),
    }),

  rejectListing: (token: string | null, listingId: string, input: AdminDecisionInput) =>
    apiFetch<AdminListing>(`/admin/listings/${listingId}/reject`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),

  suspendListing: (token: string | null, listingId: string, input: AdminDecisionInput) =>
    apiFetch<AdminListing>(`/admin/listings/${listingId}/suspend`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),
};
