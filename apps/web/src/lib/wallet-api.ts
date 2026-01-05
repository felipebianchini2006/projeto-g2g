import { apiFetch } from './api-client';

export type LedgerEntryType = 'CREDIT' | 'DEBIT';
export type LedgerEntryState = 'HELD' | 'AVAILABLE' | 'REVERSED';
export type LedgerEntrySource = 'ORDER_PAYMENT' | 'REFUND' | 'FEE' | 'PAYOUT';

export type WalletSummary = {
  currency: string;
  heldCents: number;
  availableCents: number;
  reversedCents: number;
};

export type WalletEntry = {
  id: string;
  type: LedgerEntryType;
  state: LedgerEntryState;
  source: LedgerEntrySource;
  amountCents: number;
  currency: string;
  description?: string | null;
  orderId?: string | null;
  paymentId?: string | null;
  createdAt: string;
};

export type WalletEntriesResponse = {
  items: WalletEntry[];
  total: number;
  skip: number;
  take: number;
};

export type WalletEntriesQuery = {
  from?: string;
  to?: string;
  source?: LedgerEntrySource;
  skip?: number;
  take?: number;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const buildQuery = (query: WalletEntriesQuery) => {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.source) params.set('source', query.source);
  if (typeof query.skip === 'number') params.set('skip', String(query.skip));
  if (typeof query.take === 'number') params.set('take', String(query.take));
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

export const walletApi = {
  getSummary: (token: string | null) =>
    apiFetch<WalletSummary>('/wallet/summary', {
      headers: authHeaders(token),
    }),

  listEntries: (token: string | null, query: WalletEntriesQuery) =>
    apiFetch<WalletEntriesResponse>(`/wallet/entries${buildQuery(query)}`, {
      headers: authHeaders(token),
    }),
};
