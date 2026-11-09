// All calls go to this site's own /api/v1 (forwarded to the NestJS server by next.config.mjs), with the sign-in cookie.
export type ApiError = Error & { status?: number; data?: any };

// `body` can be a plain object (sent as JSON) or FormData (sent as a file upload).
export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message[0] : data.message;
    const err = new Error(msg || 'Something went wrong. Please try again.') as ApiError;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}
