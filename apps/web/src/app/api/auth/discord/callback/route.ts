import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

import {
  apiPost,
  buildAuthResponse,
  buildErrorResponse,
} from '../../../../../lib/auth-server';

const STATE_COOKIE = 'discord_oauth_state';
const NEXT_COOKIE = 'discord_oauth_next';

const isSafeNext = (value: string | null) =>
  !!value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');

const buildCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const storedNext = cookieStore.get(NEXT_COOKIE)?.value;
  const redirectTarget = isSafeNext(storedNext) ? storedNext : '/';

  if (!code || !state || !storedState || state !== storedState) {
    const errorResponse = NextResponse.json({ message: 'Invalid OAuth state.' }, { status: 400 });
    errorResponse.cookies.set(STATE_COOKIE, '', buildCookieOptions(0));
    errorResponse.cookies.set(NEXT_COOKIE, '', buildCookieOptions(0));
    return errorResponse;
  }

  const redirectUri = process.env['DISCORD_REDIRECT_URI'];
  if (!redirectUri) {
    const errorResponse = NextResponse.json(
      { message: 'Discord OAuth not configured.' },
      { status: 500 },
    );
    errorResponse.cookies.set(STATE_COOKIE, '', buildCookieOptions(0));
    errorResponse.cookies.set(NEXT_COOKIE, '', buildCookieOptions(0));
    return errorResponse;
  }

  const { response, payload } = await apiPost('/auth/discord/exchange', {
    code,
    redirectUri,
  });

  if (!response.ok) {
    const errorResponse = buildErrorResponse(payload, 'Discord login failed.', response.status);
    errorResponse.cookies.set(STATE_COOKIE, '', buildCookieOptions(0));
    errorResponse.cookies.set(NEXT_COOKIE, '', buildCookieOptions(0));
    return errorResponse;
  }

  const authResponse = buildAuthResponse(payload as Parameters<typeof buildAuthResponse>[0]);
  const redirectResponse = NextResponse.redirect(new URL(redirectTarget, request.url));
  const refreshCookie = authResponse.cookies.get('g2g_refresh');
  if (refreshCookie) {
    redirectResponse.cookies.set(refreshCookie);
  }
  redirectResponse.cookies.set(STATE_COOKIE, '', buildCookieOptions(0));
  redirectResponse.cookies.set(NEXT_COOKIE, '', buildCookieOptions(0));
  return redirectResponse;
}
