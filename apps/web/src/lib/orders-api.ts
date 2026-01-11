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

export type DeliveryEvidence = {
  id: string;
  type: 'TEXT' | 'LINK' | 'URL' | 'FILE';
  content: string;
  createdAt?: string;
  createdByUserId?: string | null;
  orderItemId?: string;
};

export type OrderItem = {
  id: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
  deliveryType: 'AUTO' | 'MANUAL';
  inventoryItems?: { id: string; code: string; status: string }[];
  deliveryEvidence?: DeliveryEvidence[];
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

export type OrderAttribution = {
  source: 'LINK' | 'COUPON' | 'NONE';
  partnerId?: string | null;
  couponId?: string | null;
  originalTotalCents: number;
  discountAppliedCents: number;
  platformFeeBaseCents: number;
  platformFeeFinalCents: number;
  partnerCommissionCents: number;
  createdAt: string;
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
  attribution?: OrderAttribution | null;
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
  evidence: DeliveryEvidence[];
};

const authHeaders = (token: string | null): HeadersInit | undefined =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

export const ordersApi = {
  checkout: (
    token: string | null,
    listingId: string,
    quantity = 1,
    options?: { couponCode?: string; referralSlug?: string },
  ) => {
    const payload: Record<string, unknown> = { listingId, quantity };
    if (options?.couponCode) {
      payload.couponCode = options.couponCode;
    }
    if (options?.referralSlug) {
      payload.referralSlug = options.referralSlug;
    }
    return apiFetch<CheckoutResponse>('/checkout', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
  },

  createOrder: (
    token: string | null,
    listingId: string,
    quantity = 1,
    options?: { couponCode?: string; referralSlug?: string },
  ) => {
    const payload: Record<string, unknown> = { listingId, quantity };
    if (options?.couponCode) {
      payload.couponCode = options.couponCode;
    }
    if (options?.referralSlug) {
      payload.referralSlug = options.referralSlug;
    }
    return apiFetch<Order>('/orders', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
  },

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

  addManualEvidence: (token: string | null, orderId: string, payload: CreateEvidencePayload) =>
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

  markManualDelivered: (token: string | null, orderId: string, note?: string) =>
    apiFetch<Order>(`/orders/${orderId}/mark-delivered`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ note }),
    }),
};
