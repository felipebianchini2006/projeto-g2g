import { randomBytes } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/api/oauth2/authorize';
const STATE_COOKIE = 'discord_oauth_state';
const NEXT_COOKIE = 'discord_oauth_next';
const STATE_TTL_SECONDS = 600;

const isSafeNext = (value: string | null) =>
  !!value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ message: 'Discord OAuth not configured.' }, { status: 500 });
  }

  const state = randomBytes(16).toString('hex');
  const nextParam = request.nextUrl.searchParams.get('next');
  const nextPath = isSafeNext(nextParam) ? nextParam : null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
  });

  const response = NextResponse.redirect(`${DISCORD_AUTHORIZE_URL}?${params.toString()}`);
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

  return response;
}
