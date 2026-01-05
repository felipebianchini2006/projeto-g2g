import { apiPost, buildErrorResponse } from '../../../../lib/auth-server';

export async function POST(request: Request) {
  const body = await request.json();
  const { response, payload } = await apiPost('/auth/reset-password', body);

  if (!response.ok) {
    return buildErrorResponse(payload, 'Reset password failed.', response.status);
  }

  return Response.json(payload);
}
