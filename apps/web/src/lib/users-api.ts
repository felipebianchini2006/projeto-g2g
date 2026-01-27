import { ApiClientError, apiFetch } from './api-client';
import type { PixPayment } from './payments-api';
import { emitGlobalError } from './global-error';

export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  cpf: string | null;
  birthDate: string | null;
  addressZip: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressCountry: string | null;
  phoneE164: string | null;
  phoneVerifiedAt: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  gameTags?: string[] | null;
  verificationFeeOrderId?: string | null;
  verificationFeePaidAt?: string | null;
};

export type UserProfileUpdate = Partial<
  Omit<UserProfile, 'id' | 'email' | 'avatarUrl' | 'verificationFeeOrderId' | 'verificationFeePaidAt' | 'phoneE164' | 'phoneVerifiedAt'>
> & {
  phone?: string;
};

const authHeaders = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);

const resolveBaseUrl = () =>
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const buildUrl = (path: string, baseUrl = resolveBaseUrl()) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  if (contentType.includes('text/')) {
    return response.text();
  }
  return null;
};

const toErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
};

export const usersApi = {
  getProfile: (token: string | null) =>
    apiFetch<UserProfile>('/users/me', { headers: authHeaders(token) }),
  updateProfile: (token: string | null, payload: UserProfileUpdate) =>
    apiFetch<UserProfile>('/users/me', {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    }),
  requestPhoneVerification: (token: string | null) =>
    apiFetch<{ challengeId: string }>('/users/me/phone/verify', {
      method: 'POST',
      headers: authHeaders(token),
    }),
  confirmPhoneVerification: (token: string | null, challengeId: string, code: string) =>
    apiFetch<{ success: true }>('/users/me/phone/confirm', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ challengeId, code }),
    }),
  uploadAvatar: async (token: string | null, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(buildUrl('/users/me/avatar'), {
        method: 'POST',
        headers: {
          ...authHeaders(token),
        },
        body: formData,
      });

      const payload = await parseResponse(response);
      if (!response.ok) {
        const message = toErrorMessage(payload, response.statusText);
        emitGlobalError({ message, status: response.status, source: 'users' });
        throw new ApiClientError(message, response.status, payload);
      }

      return payload as UserProfile;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Network error';
      emitGlobalError({ message, source: 'users' });
      throw new ApiClientError(message, 0);
    }
  },
  getFollowStatus: (token: string | null, targetId: string) =>
    apiFetch<{ following: boolean }>(`/users/${targetId}/follow`, {
      headers: authHeaders(token),
    }),
  toggleFollow: (token: string | null, targetId: string) =>
    apiFetch<{ following: boolean }>(`/users/${targetId}/follow`, {
      method: 'POST',
      headers: authHeaders(token),
    }),
  getVerificationFeeStatus: (token: string | null) =>
    apiFetch<{
      status: 'PAID' | 'PENDING' | 'NOT_PAID';
      paidAt?: string;
      payment?: PixPayment;
    }>('/users/me/verification-fee', {
      headers: authHeaders(token),
    }),
  createVerificationFeePix: (token: string | null) =>
    apiFetch<{
      status: 'PAID' | 'PENDING' | 'NOT_PAID';
      paidAt?: string;
      payment?: PixPayment;
    }>('/users/me/verification-fee/pix', {
      method: 'POST',
      headers: authHeaders(token),
    }),
  upgradeToSeller: (token: string | null) =>
    apiFetch<{ id: string; role: 'USER' | 'SELLER' | 'ADMIN' }>(
      '/users/me/upgrade-seller',
      {
        method: 'POST',
        headers: authHeaders(token),
      },
    ),
};
