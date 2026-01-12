import { randomBytes } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_COOKIE = 'google_oauth_state';
const NEXT_COOKIE = 'google_oauth_next';
const ROLE_COOKIE = 'google_oauth_role';
const STATE_TTL_SECONDS = 600;

const isSafeNext = (value: string | null) =>
  !!value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');

const isValidRole = (value: string | null) => value === 'USER' || value === 'SELLER';

export async function GET(request: NextRequest) {
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  const redirectUri = process.env['GOOGLE_REDIRECT_URI'];

  if (!clientId || !redirectUri) {
    return NextResponse.json({ message: 'Google OAuth not configured.' }, { status: 500 });
  }

  const state = randomBytes(16).toString('hex');
  const nextParam = request.nextUrl.searchParams.get('next');
  const roleParam = request.nextUrl.searchParams.get('role');
  const nextPath = isSafeNext(nextParam) ? nextParam : null;
  const role = isValidRole(roleParam) ? roleParam : null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTHORIZE_URL}?${params.toString()}`);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  });

  if (nextPath) {
    response.cookies.set(NEXT_COOKIE, nextPath, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STATE_TTL_SECONDS,
    });
  }

  if (role) {
    response.cookies.set(ROLE_COOKIE, role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STATE_TTL_SECONDS,
    });
  }

  return response;
}
