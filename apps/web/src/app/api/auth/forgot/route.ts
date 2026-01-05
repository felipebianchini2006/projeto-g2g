import { apiPost, buildErrorResponse } from '../../../../lib/auth-server';

export async function POST(request: Request) {
  const body = await request.json();
  const { response, payload } = await apiPost('/auth/forgot-password', body);

  if (!response.ok) {
    return buildErrorResponse(payload, 'Forgot password failed.', response.status);
  }

  return Response.json(payload);
}
