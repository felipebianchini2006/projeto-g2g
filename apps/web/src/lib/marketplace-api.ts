import { apiFetch, ApiClientError } from './api-client';
import { emitGlobalError } from './global-error';

export type ListingStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'SUSPENDED';
export type DeliveryType = 'AUTO' | 'MANUAL';
export type ListingMediaType = 'IMAGE' | 'VIDEO';

export type ListingMedia = {
  id: string;
  url: string;
  type: ListingMediaType;
  position: number;
};

export type Listing = {
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
  status: ListingStatus;
  deliveryType: DeliveryType;
  deliverySlaHours: number;
  refundPolicy: string;
  media?: ListingMedia[];
  inventoryAvailableCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ListingInput = {
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
  deliveryType: DeliveryType;
  deliverySlaHours: number;
  refundPolicy: string;
};

export type ListingUpdateInput = Partial<ListingInput>;

export type InventoryActionResult = {
  created?: number;
  skipped?: number;
  removed?: number;
};

const resolveBaseUrl = () =>
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const buildUrl = (path: string, baseUrl = resolveBaseUrl()) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  if (contentType.includes('text/')) {
    return response.text();
  }
  return null;
};

const toErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
};

export const marketplaceApi = {
  listSellerListings: (token: string | null) =>
    apiFetch<Listing[]>('/listings', { headers: authHeaders(token) }),

  getSellerListing: (token: string | null, listingId: string) =>
    apiFetch<Listing>(`/listings/${listingId}`, { headers: authHeaders(token) }),

  createListing: (token: string | null, input: ListingInput) =>
    apiFetch<Listing>('/listings', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),

  updateListing: (token: string | null, listingId: string, input: ListingUpdateInput) =>
    apiFetch<Listing>(`/listings/${listingId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),

  submitListing: (token: string | null, listingId: string) =>
    apiFetch<Listing>(`/listings/${listingId}/submit`, {
      method: 'POST',
      headers: authHeaders(token),
    }),

  archiveListing: (token: string | null, listingId: string) =>
    apiFetch<Listing>(`/listings/${listingId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  addInventoryItems: (token: string | null, listingId: string, codes: string[]) =>
    apiFetch<InventoryActionResult>(`/listings/${listingId}/inventory/items`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ codes }),
    }),

  importInventoryItems: (token: string | null, listingId: string, payload: string) =>
    apiFetch<InventoryActionResult>(`/listings/${listingId}/inventory/import`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ payload }),
    }),

  removeInventoryItem: (token: string | null, listingId: string, itemId: string) =>
    apiFetch<InventoryActionResult>(`/listings/${listingId}/inventory/items/${itemId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  reserveInventory: (token: string | null, listingId: string, quantity = 1) =>
    apiFetch<InventoryActionResult>(`/listings/${listingId}/inventory/reserve`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ quantity }),
    }),

  uploadMedia: async (
    token: string | null,
    listingId: string,
    file: File,
    position?: number,
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (typeof position === 'number') {
        formData.append('position', `${position}`);
      }

      const response = await fetch(buildUrl(`/listings/${listingId}/media/upload`), {
        method: 'POST',
        headers: {
          ...authHeaders(token),
        },
        body: formData,
      });

      const payload = await parseResponse(response);
      if (!response.ok) {
        const message = toErrorMessage(payload, response.statusText);
        emitGlobalError({ message, status: response.status, source: 'media' });
        throw new ApiClientError(message, response.status, payload);
      }

      return payload as ListingMedia;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Network error';
      emitGlobalError({ message, source: 'media' });
      throw new ApiClientError(message, 0);
    }
  },

  removeMedia: (token: string | null, listingId: string, mediaId: string) =>
    apiFetch<void>(`/listings/${listingId}/media/${mediaId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
};

