/** Mirrors Prisma `UserRole` from the backend. */
export type UserRole = 'IYALOJA' | 'MEMBER' | 'CLINIC_ADMIN';

export type AuthUser = {
  id: string;
  phone: string;
  role: UserRole;
};

export type ClaimStatusApi = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'FAILED';

export type ClaimListItem = {
  id: string;
  associationId: string;
  memberId: string;
  hospitalName: string;
  billAmount: number;
  approvedAmount: number | null;
  status: ClaimStatusApi;
  createdAt: string;
};

export type ClaimDetail = ClaimListItem & {
  billPhotoUrl: string | null;
  description: string | null;
  member: { id: string; userId: string | null };
  association: { id: string; name: string };
};
