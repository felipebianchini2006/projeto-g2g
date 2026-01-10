import { apiFetch } from './api-client';

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

const buildQuery = (key: string, value?: string) =>
  value ? `?${encodeURIComponent(key)}=${encodeURIComponent(value)}` : '';

const fetchPublicApi = async <T>(path: string): Promise<T> => {
  if (typeof window === 'undefined') {
    return apiFetch<T>(path);
  }
  return apiFetch<T>(`/api${path}`, {}, '');
};

export const catalogPublicApi = {
  listGroups: (categoryId?: string) =>
    fetchPublicApi<CatalogGroup[]>(
      `/public/catalog/groups${buildQuery('categoryId', categoryId)}`,
    ),
  listSections: (groupId?: string) =>
    fetchPublicApi<CatalogSection[]>(
      `/public/catalog/sections${buildQuery('groupId', groupId)}`,
    ),
  listSalesModels: () => fetchPublicApi<CatalogOption[]>('/public/catalog/sales-models'),
  listOrigins: () => fetchPublicApi<CatalogOption[]>('/public/catalog/origins'),
  listRecoveryOptions: () =>
    fetchPublicApi<CatalogOption[]>('/public/catalog/recovery-options'),
};
