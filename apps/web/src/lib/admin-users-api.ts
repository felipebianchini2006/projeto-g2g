import { apiFetch } from './api-client';

export type AdminUserRole = 'USER' | 'SELLER' | 'ADMIN';

export type AdminUser = {
  id: string;
  email: string;
  role: AdminUserRole;
  blockedAt?: string | null;
  blockedReason?: string | null;
  payoutBlockedAt?: string | null;
  payoutBlockedReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUsersResponse = {
  items: AdminUser[];
  total: number;
  skip: number;
  take: number;
};

export type AdminUsersQuery = {
  role?: AdminUserRole;
  blocked?: boolean;
  search?: string;
  skip?: number;
  take?: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const buildQuery = (query?: AdminUsersQuery) => {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  if (query.role) {
    params.set('role', query.role);
  }
  if (typeof query.blocked === 'boolean') {
    params.set('blocked', String(query.blocked));
  }
  if (query.search) {
    params.set('search', query.search);
  }
  if (typeof query.skip === 'number') {
    params.set('skip', String(query.skip));
  }
  if (typeof query.take === 'number') {
    params.set('take', String(query.take));
  }
  const value = params.toString();
  return value ? `?${value}` : '';
};

export const adminUsersApi = {
  listUsers: (token: string | null, query?: AdminUsersQuery) =>
    apiFetch<AdminUsersResponse>(`/admin/users${buildQuery(query)}`, {
      headers: authHeaders(token),
    }),

  blockUser: (token: string | null, userId: string, reason: string) =>
    apiFetch<AdminUser>(`/admin/users/${userId}/block`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    }),

  unblockUser: (token: string | null, userId: string) =>
    apiFetch<AdminUser>(`/admin/users/${userId}/unblock`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
};
