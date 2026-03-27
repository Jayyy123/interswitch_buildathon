// ─── Auth ─────────────────────────────────────────────────────────────────────

export type VerifyOtpResponse = {
  accessToken: string;
  user: { id: string; phone: string; role: string };
  isNewUser: boolean;
  hasAssociation: boolean;
  hasClinic: boolean;
  clinicId: string | null;
};

// ─── Payments / Claims (member-side) ─────────────────────────────────────────

export type ClaimListItem = {
  id: string;
  associationId: string;
  memberId: string;
  hospitalName: string;
  billAmount: number;
  approvedAmount: number | null;
  status: string;
  createdAt: string;
};

// ─── Clinic ───────────────────────────────────────────────────────────────────

export type MemberLookupResult = {
  memberId: string;
  name: string | null;
  phone: string;
  status: 'ACTIVE' | 'PAUSED' | 'FLAGGED' | 'INCOMPLETE';
  association: string;
  associationId: string;
  plan: string;
  coverageLimit: number;
  coverageUsed: number;
  coverageRemaining: number;
};

export type ClinicStats = {
  pending: number;
  paid: number;
  failed: number;
  totalPaidOut: number;
};

export type ClinicSetup = {
  id: string;
  name: string;
  address: string | null;
  bankAccount: string | null;
  bankCode: string | null;
} | null;

// ─── Claims (clinic-side) ─────────────────────────────────────────────────────

export type ClinicClaimResult = {
  claimId: string;
  status: string;
  approvedAmount: number;
  interswitchRef: string | null;
  message: string;
};

export type ClinicClaim = {
  id: string;
  memberId: string;
  associationId: string;
  hospitalName: string;
  billAmount: number;
  approvedAmount: number | null;
  status: string;
  createdAt: string;
  member: { name: string | null; phone: string; status: string } | null;
  association: { name: string; plan: string } | null;
};

// ─── Register clinic ──────────────────────────────────────────────────────────

export type RegisterClinicResponse = {
  clinicId: string;
  clinicName: string;
  adminId: string;
};
