import { apiFetch } from './api-client';

export type SupportChatMessage = {
  id: string;
  sessionId: string;
  role: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  createdAt: string;
};

type SupportChatSessionResponse = {
  sessionId: string;
};

type SupportChatSendResponse = {
  userMessage: SupportChatMessage;
  aiMessage: SupportChatMessage;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const supportAiApi = {
  createSession: (token: string | null) =>
    apiFetch<SupportChatSessionResponse>('/support/chat/sessions', {
      method: 'POST',
      headers: authHeaders(token),
    }),
  listMessages: (token: string | null, sessionId: string) =>
    apiFetch<SupportChatMessage[]>(`/support/chat/sessions/${sessionId}/messages`, {
      headers: authHeaders(token),
    }),
  sendMessage: (token: string | null, sessionId: string, message: string) =>
    apiFetch<SupportChatSendResponse>(`/support/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ message }),
    }),
};
