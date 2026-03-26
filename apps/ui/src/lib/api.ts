import { getStoredToken } from '@/lib/session';

const baseUrl = () =>
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const parseErrorMessage = (body: unknown): string => {
  if (!body || typeof body !== 'object') return 'Something went wrong';
  const b = body as { message?: unknown; error?: string };
  if (typeof b.message === 'string') return b.message;
  if (Array.isArray(b.message)) return b.message.join(', ');
  if (typeof b.error === 'string') return b.error;
  return 'Something went wrong';
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null; skipAuth?: boolean } = {},
): Promise<T> {
  const { token: tokenOpt, skipAuth, ...init } = options;
  const token = skipAuth ? null : (tokenOpt ?? getStoredToken());

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(parseErrorMessage(body), res.status);
  }

  return body as T;
}

export async function sendOtp(phone: string) {
  const result = await apiFetch<{ message: string; code?: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
    skipAuth: true,
  });
  return result;
}

export async function verifyOtp(payload: { phone: string; code: string; role: string }) {
  const result = await apiFetch<{
    accessToken: string;
    user: { id: string; phone: string; role: string };
  }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });
  return result;
}

export async function getClaims() {
  const result = await apiFetch<
    {
      id: string;
      associationId: string;
      memberId: string;
      hospitalName: string;
      billAmount: number;
      approvedAmount: number | null;
      status: string;
      createdAt: string;
    }[]
  >('/payments/claims');
  return result;
}

export async function getClaimById(id: string) {
  const result = await apiFetch<import('@/lib/auth-types').ClaimDetail>(
    `/payments/claims/${encodeURIComponent(id)}`,
  );
  return result;
}
