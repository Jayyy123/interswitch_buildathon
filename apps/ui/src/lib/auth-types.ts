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

export type Association = {
  id: string;
  name: string;
  cacNumber?: string | null;
  plan: 'BRONZE' | 'SILVER' | 'GOLD';
  poolBalance: number;
  monthlyDues?: number;
  coverageLimit?: number;
  walletId?: string | null;
  walletAccountNumber?: string | null;
  memberCount?: number;
  userRole?: 'OWNER' | 'MEMBER';
};

export type CreateAssociationPayload = {
  name: string;
  plan: 'BRONZE' | 'SILVER' | 'GOLD';
  monthlyDues: number;
  coverageLimit: number;
  cacNumber?: string;
};

export type AssociationDashboard = {
  poolBalance: number;
  activeMemberCount: number;
  pausedMemberCount: number;
  flaggedMemberCount: number;
  totalPaidOut: number;
  nextDebitDate: string;
  plan: 'BRONZE' | 'SILVER' | 'GOLD';
  name: string;
};

export type AssociationWallet = {
  walletId: string | null;
  walletAccountNumber: string | null;
  poolBalance: number;
  weeklyTarget: number;
  collectedThisWeek: number;
  weeklyAmountPerMember: number;
};

export type AssociationMemberStatus = 'ACTIVE' | 'PAUSED' | 'FLAGGED' | 'INCOMPLETE';
export type AssociationMemberWalletStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export type AssociationMember = {
  id: string;
  name: string;
  phone: string;
  status: AssociationMemberStatus;
  walletStatus: AssociationMemberWalletStatus;
  walletId: string | null;
  walletAccountNumber: string | null;
  consecutiveMissedPayments: number;
  enrolledAt: string;
};

export type AssociationMembersResponse = {
  data: AssociationMember[];
  total: number;
  page: number;
  limit: number;
};

export type AssociationMemberContribution = {
  id: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  source: 'DIRECT_DEBIT' | 'CASH';
  week: string;
};

export type AssociationMemberDetail = {
  id: string;
  name: string;
  phone: string;
  bvn: string;
  status: AssociationMemberStatus;
  walletStatus: AssociationMemberWalletStatus;
  walletId: string | null;
  walletAccountNumber: string | null;
  bankAccount: {
    accountNumber: string;
    balance: number;
  } | null;
  coverageUsedThisYear: number;
  consecutiveMissedPayments: number;
  contributionStreak: number;
  enrolledAt: string;
  recentContributions: AssociationMemberContribution[];
};

export type EnrollAssociationMemberItem = {
  fullName: string;
  phoneNumber: string;
  bvn: string;
};

export type EnrollAssociationMembersPayload = {
  members: EnrollAssociationMemberItem[];
};

export type AssociationClaimsResponse = {
  data: Array<{
    id: string;
    hospitalName: string;
    billAmount: number;
    approvedAmount: number | null;
    status: ClaimStatusApi;
    description: string | null;
    createdAt: string;
    member: { id: string; name: string; phone: string };
  }>;
  total: number;
  page: number;
  limit: number;
};

export type AssociationClaimDetail = {
  id: string;
  hospitalName: string;
  billAmount: number;
  approvedAmount: number | null;
  status: ClaimStatusApi;
  description: string | null;
  billPhotoUrl: string | null;
  createdAt: string;
  member: { id: string; name: string; phone: string };
  association: { id: string; name: string };
};

export type AssociationTransactionsResponse = {
  data: Array<{
    id: string;
    amount: number;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    source: 'DIRECT_DEBIT' | 'CASH';
    week: string;
    createdAt: string;
    member: { id: string; name: string; phone: string };
  }>;
  total: number;
  page: number;
  limit: number;
};

export type VerifyAssociationPaymentPayload = {
  transactionReference: string;
  amountKobo: number;
};

export type VerifyAssociationPaymentResponse = {
  success: boolean;
  message?: string;
  credited?: number;
  newBalance?: number;
};

export type UpdateAssociationPayload = {
  name?: string;
  cacNumber?: string;
  plan?: 'BRONZE' | 'SILVER' | 'GOLD';
  monthlyDues?: number;
  coverageLimit?: number;
};
