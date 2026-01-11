import { apiFetch } from './api-client';

export type Coupon = {
  id: string;
  code: string;
  partnerId?: string | null;
  active: boolean;
  discountBps?: number | null;
  discountCents?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
  usesCount: number;
  createdAt: string;
  updatedAt: string;
  partner?: { id: string; name: string; slug: string } | null;
};

export type CouponPayload = {
  code: string;
  partnerId?: string | null;
  active?: boolean;
  discountBps?: number | null;
  discountCents?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
};

export type CouponUpdatePayload = Partial<CouponPayload>;

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export const adminCouponsApi = {
  listCoupons: (token: string | null) =>
    apiFetch<Coupon[]>('/admin/coupons', { headers: authHeaders(token) }),

  createCoupon: (token: string | null, payload: CouponPayload) =>
    apiFetch<Coupon>('/admin/coupons', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),

  updateCoupon: (token: string | null, couponId: string, payload: CouponUpdatePayload) =>
    apiFetch<Coupon>(`/admin/coupons/${couponId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
};
