import { ApiRequestError } from '../types/customer';

const DEFAULT_TIMEOUT_MS = 10_000;
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5150').replace(/\/+$/, '');

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      if (firstKey && Array.isArray(data.errors[firstKey])) {
        return data.errors[firstKey][0];
      }
    }
    if (typeof data?.title === 'string') return data.title;
    if (typeof data?.message === 'string') return data.message;
  } catch {
    // Response body is not JSON; fall through to HTTP status text.
  }
  return `Request failed (${response.status} ${response.statusText})`;
}

export async function httpRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = options;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const onExternalAbort = () => timeoutController.abort();
  signal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      signal: timeoutController.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      throw new ApiRequestError(message, response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
