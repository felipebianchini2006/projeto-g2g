import { NextResponse } from 'next/server';

const RAW_API_URL =
  process.env.API_PROXY_TARGET ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

const parsePayload = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  if (contentType.includes('text/')) {
    return response.text();
  }
  return null;
};

export async function GET() {
  const response = await fetch(`${API_URL}/public/categories`, { cache: 'no-store' });
  const payload = await parsePayload(response);
  return NextResponse.json(payload, { status: response.status });
}

