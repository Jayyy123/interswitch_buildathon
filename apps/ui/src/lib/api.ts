import { getStoredToken } from '@/lib/session';
import type {
  Association,
  AssociationClaimDetail,
  AssociationClaimsResponse,
  AssociationDashboard,
  AssociationMemberDetail,
  AssociationMembersResponse,
  AssociationTransactionsResponse,
  AssociationWallet,
  ClaimDetail,
  CreateAssociationPayload,
  EnrollAssociationMembersPayload,
  UpdateAssociationPayload,
  VerifyAssociationPaymentPayload,
  VerifyAssociationPaymentResponse,
} from '@/lib/auth-types';
import type {
  ClaimListItem,
  ClinicClaim,
  ClinicClaimResult,
  ClinicSetup,
  ClinicStats,
  MemberLookupResult,
  RegisterClinicResponse,
  VerifyOtpResponse,
} from './api.types';

// Re-export types so existing imports from '@/lib/api' keep working
export type {
  ClaimListItem,
  ClinicClaim,
  ClinicClaimResult,
  ClinicSetup,
  ClinicStats,
  MemberLookupResult,
  RegisterClinicResponse,
  VerifyOtpResponse,
} from './api.types';

// ─── Core fetch infra ─────────────────────────────────────────────────────────

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

export const apiFetch = async <T>(
  path: string,
  options: RequestInit & { token?: string | null; skipAuth?: boolean } = {},
): Promise<T> => {
  const { token: tokenOpt, skipAuth, ...init } = options;
  const token = skipAuth ? null : (tokenOpt ?? getStoredToken());

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { message: text };
    }
  }

  if (!res.ok) throw new ApiError(parseErrorMessage(body), res.status);
  return body as T;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const sendOtp = async (phone: string) =>
  apiFetch<{ message: string; code?: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
    skipAuth: true,
  });

export const verifyOtp = async (payload: { phone: string; code: string; role: string }) =>
  apiFetch<VerifyOtpResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

// ─── Payments / Claims (member-side) ─────────────────────────────────────────

export const getClaims = async () => apiFetch<ClaimListItem[]>('/payments/claims');

export const getClaimById = async (id: string) =>
  apiFetch<ClaimDetail>(`/payments/claims/${encodeURIComponent(id)}`);

// ─── Associations ─────────────────────────────────────────────────────────────

export const getMyAssociations = async () => apiFetch<Association[]>('/associations');

export const createAssociation = async (payload: CreateAssociationPayload) =>
  apiFetch<Association>('/associations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateAssociation = async (associationId: string, payload: UpdateAssociationPayload) =>
  apiFetch<Association>(`/associations/${encodeURIComponent(associationId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const getAssociationDashboard = async (associationId: string) =>
  apiFetch<AssociationDashboard>(`/associations/${encodeURIComponent(associationId)}/dashboard`);

export const getAssociationWallet = async (associationId: string) =>
  apiFetch<AssociationWallet>(`/associations/${encodeURIComponent(associationId)}/wallet`);

export const getAssociationMembers = async (
  associationId: string,
  params: { page?: number; limit?: number; status?: string; search?: string } = {},
) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<AssociationMembersResponse>(
    `/associations/${encodeURIComponent(associationId)}/members${suffix}`,
  );
};

export const getAssociationMemberById = async (associationId: string, memberId: string) =>
  apiFetch<AssociationMemberDetail>(
    `/associations/${encodeURIComponent(associationId)}/members/${encodeURIComponent(memberId)}`,
  );

export const enrollAssociationMembers = async (
  associationId: string,
  payload: EnrollAssociationMembersPayload,
) =>
  apiFetch(`/associations/${encodeURIComponent(associationId)}/members/enroll`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const retryAssociationMemberWallet = async (associationId: string, memberId: string) =>
  apiFetch(
    `/associations/${encodeURIComponent(associationId)}/members/${encodeURIComponent(memberId)}/retry-wallet`,
    {
      method: 'POST',
    },
  );

export const getAssociationClaims = async (
  associationId: string,
  params: { page?: number; limit?: number; status?: string } = {},
) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<AssociationClaimsResponse>(
    `/associations/${encodeURIComponent(associationId)}/claims${suffix}`,
  );
};

export const getAssociationClaimById = async (associationId: string, claimId: string) =>
  apiFetch<AssociationClaimDetail>(
    `/associations/${encodeURIComponent(associationId)}/claims/${encodeURIComponent(claimId)}`,
  );

export const getAssociationTransactions = async (
  associationId: string,
  params: { page?: number; limit?: number; source?: string; week?: string } = {},
) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.source) query.set('source', params.source);
  if (params.week) query.set('week', params.week);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<AssociationTransactionsResponse>(
    `/associations/${encodeURIComponent(associationId)}/transactions${suffix}`,
  );
};

export const verifyAssociationPayment = async (
  associationId: string,
  payload: VerifyAssociationPaymentPayload,
) =>
  apiFetch<VerifyAssociationPaymentResponse>(
    `/associations/${encodeURIComponent(associationId)}/verify-payment`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

// ─── Clinic — identity ────────────────────────────────────────────────────────

export const registerClinic = async (payload: {
  name: string;
  address?: string;
  bankAccount?: string;
  bankCode?: string;
}): Promise<RegisterClinicResponse> =>
  apiFetch('/clinic/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getClinicSetup = async (): Promise<ClinicSetup> =>
  apiFetch<ClinicSetup>('/clinic/setup');

export const saveClinicSetup = async (payload: {
  name: string;
  address?: string;
  bankAccount?: string;
  bankCode?: string;
}): Promise<ClinicSetup> =>
  apiFetch<ClinicSetup>('/clinic/setup', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

// ─── Claims — clinic-side ─────────────────────────────────────────────────────

export const lookupMember = async (phone: string): Promise<MemberLookupResult> =>
  apiFetch<MemberLookupResult>(`/claims/members/lookup?phone=${encodeURIComponent(phone)}`);

export const getClinicStats = async (): Promise<ClinicStats> =>
  apiFetch<ClinicStats>('/claims/stats');

export const submitClinicClaim = async (payload: {
  memberId: string;
  associationId: string;
  billAmount: number;
  description?: string;
  billPhotoUrl?: string;
}): Promise<ClinicClaimResult> =>
  apiFetch<ClinicClaimResult>('/claims', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getClinicClaims = async (): Promise<ClinicClaim[]> =>
  apiFetch<ClinicClaim[]>('/claims');
