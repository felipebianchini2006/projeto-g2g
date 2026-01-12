import { emitGlobalError } from './global-error';

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export class ApiClientError extends Error implements ApiError {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

const resolveBaseUrl = () =>
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const buildUrl = (path: string, baseUrl: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const extractMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  if (contentType.includes('text/')) {
    return response.text();
  }
  return null;
};

type ApiFetchOptions = RequestInit & { skipGlobalError?: boolean };

export const apiFetch = async <T>(
  path: string,
  options: ApiFetchOptions = {},
  baseUrl = resolveBaseUrl(),
): Promise<T> => {
  const url = buildUrl(path, baseUrl);
  const { skipGlobalError, ...requestOptions } = options;
  const method = (requestOptions.method ?? 'GET').toUpperCase();
  const headers = new Headers(requestOptions.headers ?? {});

  if (requestOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...requestOptions,
      method,
      headers,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      const message = extractMessage(payload, response.statusText);
      if (!skipGlobalError) {
        emitGlobalError({ message, status: response.status, source: 'api' });
      }
      throw new ApiClientError(message, response.status, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network error';
    if (!skipGlobalError) {
      emitGlobalError({ message, source: 'network' });
    }
    throw new ApiClientError(message, 0);
  }
};

