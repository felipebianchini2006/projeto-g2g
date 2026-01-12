import { NextRequest, NextResponse } from 'next/server';

const REFERRAL_COOKIE = 'g2g_ref_partner';
const REFERRAL_TTL_SECONDS = 60 * 60 * 24 * 30;
const API_BASE_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);

export async function GET(request: NextRequest, context: { params: { slug: string } }) {
  const slug = context.params.slug?.trim().toLowerCase();
  const redirectUrl = new URL('/', request.url);
  const response = NextResponse.redirect(redirectUrl);

  if (slug) {
    response.cookies.set(REFERRAL_COOKIE, slug, {
      path: '/',
      maxAge: REFERRAL_TTL_SECONDS,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    try {
      await fetch(`${API_BASE_URL}/partners/${encodeURIComponent(slug)}/click`, {
        method: 'POST',
      });
    } catch {
      // Best-effort tracking.
    }
  }

  return response;
}

