import { NextResponse } from 'next/server';

const RAW_API_URL =
  process.env['API_INTERNAL_URL'] ??
  process.env['API_PROXY_TARGET'] ??
  process.env['NEXT_PUBLIC_API_URL'] ??
  'http://localhost:3001';
const API_URL = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

const forward = async (request: Request) => {
  const url = new URL(request.url);
  const targetUrl = `${API_URL}${url.pathname.replace('/api/proxy', '')}${url.search}`;
  const method = request.method.toUpperCase();
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('content-length');

  const body =
    method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: 'no-store',
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
};

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
