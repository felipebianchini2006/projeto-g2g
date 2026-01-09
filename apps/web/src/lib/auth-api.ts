import type { AuthSession, ForgotPasswordResponse, ResetPasswordResponse } from './auth-types';
import { emitGlobalError } from './global-error';

export type AuthLoginInput = {
  email: string;
  password: string;
};

export type AuthRegisterInput = AuthLoginInput & {
  role?: 'USER' | 'SELLER';
};

export type AuthResetInput = {
  token: string;
  password: string;
};

export type AuthErrorPayload = {
  message?: string;
};

export class AuthApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

const parseJson = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
};

const extractMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as AuthErrorPayload).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
};

const postJson = async <T>(path: string, body?: Record<string, unknown>): Promise<T> => {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await parseJson(response);
    if (!response.ok) {
      const message = extractMessage(payload, response.statusText);
      emitGlobalError({ message, status: response.status, source: 'auth' });
      throw new AuthApiError(message, response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network error';
    emitGlobalError({ message, source: 'auth' });
    throw new AuthApiError(message, 0);
  }
};

export const authApi = {
  login: (input: AuthLoginInput) => postJson<AuthSession>('/api/auth/login', input),
  register: (input: AuthRegisterInput) => postJson<AuthSession>('/api/auth/register', input),
  refresh: () => postJson<AuthSession>('/api/auth/refresh'),
  logout: () => postJson<{ success: true }>('/api/auth/logout'),
  forgotPassword: (email: string) =>
    postJson<ForgotPasswordResponse>('/api/auth/forgot', { email }),
  resetPassword: (input: AuthResetInput) =>
    postJson<ResetPasswordResponse>('/api/auth/reset', input),
};
