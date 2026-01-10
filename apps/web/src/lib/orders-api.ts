import { apiFetch } from './api-client';

export type OrderStatus =
  | 'CREATED'
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'FAILED';

export type OrderEvent = {
  id: string;
  type: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
};

export type OrderItem = {
  id: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
  deliveryType: 'AUTO' | 'MANUAL';
  inventoryItems?: { id: string; code: string; status: string }[];
  deliveryEvidence?: {
    id: string;
    type: string;
    content: string;
    createdAt?: string;
    createdByUserId?: string | null;
  }[];
};

export type OrderParty = {
  id: string;
  email: string;
};

export type PaymentSummary = {
  id: string;
  status: PaymentStatus;
  txid: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  qrCode?: string | null;
  copyPaste?: string | null;
};

export type Order = {
  id: string;
  status: OrderStatus;
  totalAmountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  buyerId: string;
  sellerId?: string | null;
  buyer?: OrderParty | null;
  seller?: OrderParty | null;
  items: OrderItem[];
  events?: OrderEvent[];
  payments?: PaymentSummary[];
  expiresAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  dispute?: { id: string; status: string } | null;
};

export type CheckoutResponse = {
  order: Order;
  payment: {
    id: string;
    status: string;
    txid: string;
    qrCode?: string | null;
    copyPaste?: string | null;
    expiresAt?: string | null;
    amountCents: number;
    currency: string;
  };
};

export type CreateEvidencePayload = {
  type: 'TEXT' | 'URL';
  content: string;
};

export type DeliveryEvidenceResponse = {
  orderId: string;
  evidence: {
    id: string;
    orderItemId: string;
    type: string;
    content: string;
    createdAt?: string;
    createdByUserId?: string | null;
  }[];
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const ordersApi = {
  checkout: (token: string | null, listingId: string, quantity = 1) =>
    apiFetch<CheckoutResponse>('/checkout', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ listingId, quantity }),
    }),

  listOrders: (token: string | null, scope: 'buyer' | 'seller') =>
    apiFetch<Order[]>(`/orders?scope=${scope}`, {
      headers: authHeaders(token),
    }),

  getOrder: (token: string | null, orderId: string) =>
    apiFetch<Order>(`/orders/${orderId}`, { headers: authHeaders(token) }),

  cancelOrder: (token: string | null, orderId: string, reason?: string) =>
    apiFetch<Order>(`/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    }),

  confirmReceipt: (token: string | null, orderId: string, note?: string) =>
    apiFetch<Order>(`/orders/${orderId}/confirm-receipt`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ note }),
    }),

  openDispute: (token: string | null, orderId: string, reason: string) =>
    apiFetch<Order>(`/orders/${orderId}/dispute`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ reason }),
    }),

  addEvidence: (token: string | null, orderId: string, payload: CreateEvidencePayload) =>
    apiFetch<DeliveryEvidenceResponse>(`/orders/${orderId}/evidence`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  markDelivered: (token: string | null, orderId: string, note?: string) =>
    apiFetch<Order>(`/orders/${orderId}/mark-delivered`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ note }),
    }),
};
