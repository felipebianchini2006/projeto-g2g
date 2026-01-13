import { apiFetch } from './api-client';

export type DirectChatThread = {
  id: string;
  updatedAt: string;
  participant: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
};

export type DirectChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const directChatApi = {
  listThreads: (token: string | null) =>
    apiFetch<DirectChatThread[]>('/direct-chats/threads', {
      headers: authHeaders(token),
    }),
  createThread: (token: string | null, targetUserId: string) =>
    apiFetch<{ id: string }>('/direct-chats/threads', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ targetUserId }),
    }),
  listMessages: (token: string | null, threadId: string, skip = 0, take = 50) =>
    apiFetch<{ items: DirectChatMessage[]; total: number }>(
      `/direct-chats/threads/${threadId}/messages?skip=${skip}&take=${take}`,
      {
        headers: authHeaders(token),
      },
    ),
  sendMessage: (token: string | null, threadId: string, content: string) =>
    apiFetch<DirectChatMessage>(`/direct-chats/threads/${threadId}/messages`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ content }),
    }),
};
