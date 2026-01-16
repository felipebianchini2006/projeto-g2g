import { ApiClientError, apiFetch } from './api-client';

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
};

export type CatalogGroup = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type CatalogSection = {
  id: string;
  groupId: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type CatalogOption = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

export type CatalogPayload = {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
};

export type CatalogGroupPayload = CatalogPayload & { categoryId: string };
export type CatalogSectionPayload = CatalogPayload & { groupId: string };

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const resolveBaseUrl = () => {
  if (typeof window === 'undefined') {
    return (
      process.env['API_INTERNAL_URL'] ??
      process.env['API_PROXY_TARGET'] ??
      process.env['NEXT_PUBLIC_API_URL'] ??
      'http://localhost:3001'
    );
  }
  return process.env['NEXT_PUBLIC_API_URL'] ?? '/api/proxy';
};

const buildUrl = (path: string, baseUrl: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  if (contentType.includes('text/')) {
    return response.text();
  }
  return null;
};

export const adminCatalogApi = {
  listCategories: (token: string | null) =>
    apiFetch<CatalogCategory[]>('/admin/catalog/categories', {
      headers: authHeaders(token),
    }),
  createCategory: (token: string | null, payload: CatalogPayload) =>
    apiFetch<CatalogCategory>('/admin/catalog/categories', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  uploadCategoryImage: async (token: string | null, id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const url = buildUrl(`/admin/catalog/categories/${id}/image`, resolveBaseUrl());
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: formData,
    });
    const payload = await parseResponse(response);
    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message?: unknown }).message ?? response.statusText)
          : response.statusText;
      throw new ApiClientError(message, response.status, payload);
    }
    return payload as CatalogCategory;
  },
  updateCategory: (token: string | null, id: string, payload: CatalogPayload) =>
    apiFetch<CatalogCategory>(`/admin/catalog/categories/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteCategory: (token: string | null, id: string) =>
    apiFetch<void>(`/admin/catalog/categories/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  listGroups: (token: string | null, categoryId?: string) => {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
    return apiFetch<CatalogGroup[]>(`/admin/catalog/groups${query}`, {
      headers: authHeaders(token),
    });
  },
  createGroup: (token: string | null, payload: CatalogGroupPayload) =>
    apiFetch<CatalogGroup>('/admin/catalog/groups', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateGroup: (token: string | null, id: string, payload: CatalogGroupPayload) =>
    apiFetch<CatalogGroup>(`/admin/catalog/groups/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteGroup: (token: string | null, id: string) =>
    apiFetch<void>(`/admin/catalog/groups/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  listSections: (token: string | null, groupId?: string) => {
    const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
    return apiFetch<CatalogSection[]>(`/admin/catalog/sections${query}`, {
      headers: authHeaders(token),
    });
  },
  createSection: (token: string | null, payload: CatalogSectionPayload) =>
    apiFetch<CatalogSection>('/admin/catalog/sections', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateSection: (token: string | null, id: string, payload: CatalogSectionPayload) =>
    apiFetch<CatalogSection>(`/admin/catalog/sections/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteSection: (token: string | null, id: string) =>
    apiFetch<void>(`/admin/catalog/sections/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  listSalesModels: (token: string | null) =>
    apiFetch<CatalogOption[]>('/admin/catalog/sales-models', {
      headers: authHeaders(token),
    }),
  createSalesModel: (token: string | null, payload: CatalogPayload) =>
    apiFetch<CatalogOption>('/admin/catalog/sales-models', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateSalesModel: (token: string | null, id: string, payload: CatalogPayload) =>
    apiFetch<CatalogOption>(`/admin/catalog/sales-models/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteSalesModel: (token: string | null, id: string) =>
    apiFetch<void>(`/admin/catalog/sales-models/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  listOrigins: (token: string | null) =>
    apiFetch<CatalogOption[]>('/admin/catalog/origins', {
      headers: authHeaders(token),
    }),
  createOrigin: (token: string | null, payload: CatalogPayload) =>
    apiFetch<CatalogOption>('/admin/catalog/origins', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateOrigin: (token: string | null, id: string, payload: CatalogPayload) =>
    apiFetch<CatalogOption>(`/admin/catalog/origins/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteOrigin: (token: string | null, id: string) =>
    apiFetch<void>(`/admin/catalog/origins/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  listRecoveryOptions: (token: string | null) =>
    apiFetch<CatalogOption[]>('/admin/catalog/recovery-options', {
      headers: authHeaders(token),
    }),
  createRecoveryOption: (token: string | null, payload: CatalogPayload) =>
    apiFetch<CatalogOption>('/admin/catalog/recovery-options', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  updateRecoveryOption: (token: string | null, id: string, payload: CatalogPayload) =>
    apiFetch<CatalogOption>(`/admin/catalog/recovery-options/${id}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  deleteRecoveryOption: (token: string | null, id: string) =>
    apiFetch<void>(`/admin/catalog/recovery-options/${id}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),
};
