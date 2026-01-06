import { apiFetch } from './api-client';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationQuery = {
  cursor?: string;
  take?: number;
  unread?: boolean;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const notificationsApi = {
  listNotifications: (token: string | null, query: NotificationQuery = {}) => {
    const params = new URLSearchParams();
    if (query.cursor) {
      params.set('cursor', query.cursor);
    }
    if (query.take) {
      params.set('take', String(query.take));
    }
    if (query.unread !== undefined) {
      params.set('unread', String(query.unread));
    }
    const queryString = params.toString();
    const path = queryString ? `/notifications?${queryString}` : '/notifications';
    return apiFetch<Notification[]>(path, { headers: authHeaders(token) });
  },

  markRead: (token: string | null, notificationId: string) =>
    apiFetch<{ success: true }>(`/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: authHeaders(token),
    }),

  markAllRead: (token: string | null) =>
    apiFetch<{ success: true }>('/notifications/read-all', {
      method: 'POST',
      headers: authHeaders(token),
    }),
};
