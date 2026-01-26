import {
  apiPost,
  buildAuthResponse,
  buildErrorResponse,
  buildMfaRequiredResponse,
} from '../../../../lib/auth-server';

export async function POST(request: Request) {
  const body = await request.json();
  const { response, payload } = await apiPost('/auth/login', body);

  if (!response.ok) {
    return buildErrorResponse(payload, 'Login failed.', response.status);
  }

  if (payload && typeof payload === 'object' && 'mfaRequired' in payload) {
    return buildMfaRequiredResponse(payload as Parameters<typeof buildMfaRequiredResponse>[0]);
  }

  return buildAuthResponse(payload as Parameters<typeof buildAuthResponse>[0]);
}
