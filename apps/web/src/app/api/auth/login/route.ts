import { apiPost, buildAuthResponse, buildErrorResponse } from '../../../../lib/auth-server';

export async function POST(request: Request) {
  const body = await request.json();
  const { response, payload } = await apiPost('/auth/login', body);

  if (!response.ok) {
    return buildErrorResponse(payload, 'Login failed.', response.status);
  }

  return buildAuthResponse(payload as Parameters<typeof buildAuthResponse>[0]);
}
