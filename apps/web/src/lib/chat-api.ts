import { apiFetch } from './api-client';

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const chatApi = {
  listOrderMessages: (
    token: string | null,
    orderId: string,
    cursor?: string,
    take?: number,
  ) => {
    const params = new URLSearchParams();
    if (cursor) {
      params.set('cursor', cursor);
    }
    if (take) {
      params.set('take', String(take));
    }
    const query = params.toString();
    const path = query
      ? `/chat/orders/${orderId}/messages?${query}`
      : `/chat/orders/${orderId}/messages`;
    return apiFetch<ChatMessage[]>(path, { headers: authHeaders(token) });
  },
};
