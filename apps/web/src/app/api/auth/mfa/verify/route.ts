import { apiPost, buildAuthResponse, buildErrorResponse } from '../../../../../lib/auth-server';

export async function POST(request: Request) {
  const body = await request.json();
  const { response, payload } = await apiPost('/auth/mfa/verify', body);

  if (!response.ok) {
    return buildErrorResponse(payload, 'MFA verification failed.', response.status);
  }

  return buildAuthResponse(payload as Parameters<typeof buildAuthResponse>[0]);
}
