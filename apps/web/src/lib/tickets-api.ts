import { apiFetch } from './api-client';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type Ticket = {
  id: string;
  orderId?: string | null;
  openedById: string;
  status: TicketStatus;
  subject: string;
  createdAt: string;
  updatedAt: string;
  order?: { id: string; buyerId: string; sellerId?: string | null } | null;
  messages?: TicketMessage[];
};

export type CreateTicketInput = {
  orderId?: string;
  subject: string;
  message: string;
  attachments?: string[];
};

export type TicketMessageInput = {
  message: string;
  attachments?: string[];
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const ticketsApi = {
  listTickets: (token: string | null, status?: TicketStatus) =>
    apiFetch<Ticket[]>(
      status ? `/tickets?status=${encodeURIComponent(status)}` : '/tickets',
      { headers: authHeaders(token) },
    ),

  getTicket: (token: string | null, ticketId: string) =>
    apiFetch<Ticket>(`/tickets/${ticketId}`, { headers: authHeaders(token) }),

  createTicket: (token: string | null, input: CreateTicketInput) =>
    apiFetch<Ticket>('/tickets', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),

  addMessage: (token: string | null, ticketId: string, input: TicketMessageInput) =>
    apiFetch<TicketMessage>(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(input),
    }),
};
