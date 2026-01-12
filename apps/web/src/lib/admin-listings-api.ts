import { apiFetch } from './api-client';

export type AdminListingStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'SUSPENDED';

export type AdminListing = {
  id: string;
  sellerId: string;
  categoryId: string;
  categoryGroupId?: string | null;
  categorySectionId?: string | null;
  salesModelId?: string | null;
  originId?: string | null;
  recoveryOptionId?: string | null;
  title: string;
  description?: string | null;
  priceCents: number;
  currency: string;
  status: AdminListingStatus;
  deliveryType: 'AUTO' | 'MANUAL';
  deliverySlaHours: number;
  refundPolicy: string;
  featuredAt?: string | null;
  mustHaveAt?: string | null;
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
  categoryGroup?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  categorySection?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  salesModel?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  origin?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  recoveryOption?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type AdminDecisionInput = {
  reason?: string;
};

export type AdminHomeFlagsInput = {
  featured?: boolean;
  mustHave?: boolean;
};

export type AdminCreateListingInput = {
  sellerId: string;
  categoryId: string;
  categoryGroupId?: string;
  categorySectionId?: string;
  salesModelId?: string;
  originId?: string;
  recoveryOptionId?: string;
  title: string;
  description?: string;
  priceCents: number;
  currency?: string;
  deliveryType: 'AUTO' | 'MANUAL';
  deliverySlaHours: number;
  refundPolicy: string;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminListingsApi = {
  listListings: (token: string | null, status?: AdminListingStatus) =>
    apiFetch<AdminListing[]>(
      status ? `/admin/listings?status=${encodeURIComponent(status)}` : '/admin/listings',
      { headers: authHeaders(token) },
    ),

  createListing: (token: string | null, payload: AdminCreateListingInput) =>
    apiFetch<AdminListing>('/admin/listings', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

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

  updateHomeFlags: (token: string | null, listingId: string, input: AdminHomeFlagsInput) =>
    apiFetch<AdminListing>(`/admin/listings/${listingId}/home`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),
};
