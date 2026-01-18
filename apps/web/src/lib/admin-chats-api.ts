import { apiFetch } from './api-client';

export type AdminChatUser = {
  id: string;
  email: string;
  fullName: string | null;
  role?: string;
};

export type AdminChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  type: string;
  sender: AdminChatUser;
};

export type AdminChatRoomSummary = {
  id: string;
  orderId: string;
  orderStatus: string;
  orderCreatedAt: string;
  buyer: AdminChatUser | null;
  seller: AdminChatUser | null;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    deletedAt: string | null;
    type: string;
  } | null;
  messageCount: number;
};

export type AdminChatRoomsResponse = {
  items: AdminChatRoomSummary[];
  total: number;
  take: number;
  skip: number;
};

export type AdminChatMessagesResponse = {
  roomId: string | null;
  messages: AdminChatMessage[];
};

const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminChatsApi = {
  listRooms: (token: string | null, take = 50, skip = 0) =>
    apiFetch<AdminChatRoomsResponse>(
      `/admin/chats/rooms?take=${encodeURIComponent(take)}&skip=${encodeURIComponent(skip)}`,
      { headers: authHeaders(token) },
    ),

  listMessages: (token: string | null, orderId: string, take = 50, cursor?: string) => {
    const params = new URLSearchParams();
    params.set('take', String(take));
    if (cursor) {
      params.set('cursor', cursor);
    }
    return apiFetch<AdminChatMessagesResponse>(
      `/admin/chats/rooms/${encodeURIComponent(orderId)}/messages?${params.toString()}`,
      { headers: authHeaders(token) },
    );
  },
};
