import { apiFetch } from './api-client';

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type SessionInfo = {
  id: string;
  createdAt: string;
  ip?: string | null;
  userAgent?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  lastSeenAt?: string | null;
  isCurrent: boolean;
};

export type LogoutAllResponse = {
  success: true;
  revokedSessions: number;
  revokedTokens: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const accountSecurityApi = {
  changePassword: (token: string | null, payload: ChangePasswordPayload) =>
    apiFetch<{ success: true }>('/auth/change-password', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  listSessions: (token: string | null) =>
    apiFetch<SessionInfo[]>('/auth/sessions', {
      headers: authHeaders(token),
    }),

  revokeSession: (token: string | null, sessionId: string) =>
    apiFetch<{ success: true }>(`/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    }),

  logoutAll: (token: string | null) =>
    apiFetch<LogoutAllResponse>('/auth/logout-all', {
      method: 'POST',
      headers: authHeaders(token),
    }),
};
