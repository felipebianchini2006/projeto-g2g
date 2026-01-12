import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const RAW_API_URL =
  process.env['API_PROXY_TARGET'] ?? process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;
const REFRESH_COOKIE = 'g2g_refresh';
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;

type ApiAuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: 'USER' | 'SELLER' | 'ADMIN';
    createdAt: string;
    updatedAt: string;
  };
};

type ApiErrorPayload = {
  message?: string;
};

const extractMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as ApiErrorPayload).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
};

const parseJson = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
};

export const apiPost = async (path: string, body?: Record<string, unknown>) => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await parseJson(response);
  return { response, payload };
};

export const setRefreshCookie = (response: NextResponse, refreshToken: string) => {
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TTL_SECONDS,
  });
};

export const clearRefreshCookie = (response: NextResponse) => {
  response.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
};

export const buildAuthResponse = (payload: ApiAuthResponse) => {
  const response = NextResponse.json({
    user: payload.user,
    accessToken: payload.accessToken,
  });
  setRefreshCookie(response, payload.refreshToken);
  return response;
};

export const buildErrorResponse = (payload: unknown, fallback: string, status: number) => {
  return NextResponse.json({ message: extractMessage(payload, fallback) }, { status });
};

export const getRefreshCookie = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
};

