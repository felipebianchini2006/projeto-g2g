import { NextResponse } from 'next/server';

import {
  apiPost,
  buildAuthResponse,
  buildErrorResponse,
  clearRefreshCookie,
  getRefreshCookie,
} from '../../../../lib/auth-server';

export async function POST() {
  const refreshToken = await getRefreshCookie();
  if (!refreshToken) {
    return NextResponse.json({ message: 'Missing refresh token.' }, { status: 401 });
  }

  const { response, payload } = await apiPost('/auth/refresh', { refreshToken });
  if (!response.ok) {
    const errorResponse = buildErrorResponse(payload, 'Refresh failed.', response.status);
    clearRefreshCookie(errorResponse);
    return errorResponse;
  }

  return buildAuthResponse(payload as Parameters<typeof buildAuthResponse>[0]);
}
