import { apiFetch } from './api-client';

export type LedgerEntryType = 'CREDIT' | 'DEBIT';
export type LedgerEntryState = 'HELD' | 'AVAILABLE' | 'REVERSED';
export type LedgerEntrySource =
  | 'ORDER_PAYMENT'
  | 'REFUND'
  | 'FEE'
  | 'PAYOUT'
  | 'WALLET_TOPUP'
  | 'WALLET_PAYMENT';

export type TopupResponse = {
  orderId: string;
  payment: {
    id: string;
    txid: string;
    qrCode?: string;
    copyPaste?: string;
    expiresAt: string;
    amountCents: number;
    currency: string;
  };
};

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
  availableAt?: string | null;
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

export type CreatePayoutPayload = {
  amountCents: number;
  pixKey: string;
  pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
  beneficiaryName: string;
  beneficiaryType?: 'PF' | 'PJ';
  payoutSpeed?: 'NORMAL' | 'INSTANT';
};

export type PayoutResponse = {
  id: string;
  status: 'SENT' | 'FAILED';
  amountCents: number;
  currency: string;
  pixKey: string;
};

export type WalletPaymentResponse = {
  order: {
    id: string;
    status: string;
    totalAmountCents: number;
    currency: string;
  };
  payment: {
    id: string;
    status: string;
    txid: string;
    paidAt?: string | null;
  };
};

const authHeaders = (token: string | null): Record<string, string> =>
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

  createTopupPix: (token: string | null, amountCents: number) =>
    apiFetch<TopupResponse>('/wallet/topup/pix', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ amountCents }),
    }),

  createPayout: (token: string | null, payload: CreatePayoutPayload) =>
    apiFetch<PayoutResponse>('/wallet/payouts', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  payOrder: (token: string | null, orderId: string) =>
    apiFetch<WalletPaymentResponse>('/wallet/pay-order', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ orderId }),
    }),
};
