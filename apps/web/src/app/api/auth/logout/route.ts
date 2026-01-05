import { NextResponse } from 'next/server';

import {
  apiPost,
  buildErrorResponse,
  clearRefreshCookie,
  getRefreshCookie,
} from '../../../../lib/auth-server';

export async function POST() {
  const refreshToken = getRefreshCookie();
  const response = NextResponse.json({ success: true });
  clearRefreshCookie(response);

  if (!refreshToken) {
    return response;
  }

  const result = await apiPost('/auth/logout', { refreshToken });
  if (!result.response.ok) {
    const errorResponse = buildErrorResponse(
      result.payload,
      'Logout failed.',
      result.response.status,
    );
    clearRefreshCookie(errorResponse);
    return errorResponse;
  }

  return response;
}
