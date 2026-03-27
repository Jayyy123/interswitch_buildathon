import type { ClaimStatusApi } from '@/lib/auth-types';
import type { StatusTone } from '@/components/status-badge';

export const claimStatusLabel = (status: string): string => status.replace(/_/g, ' ').toLowerCase();

export const claimStatusTone = (status: ClaimStatusApi | string): StatusTone => {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'APPROVED':
      return 'blue';
    case 'PAID':
      return 'green';
    case 'REJECTED':
    case 'FAILED':
      return 'red';
    default:
      return 'gray';
  }
};

export const formatNgn = (amount: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);

export const PLAN_WEEKLY_CONTRIBUTION: Record<'BRONZE' | 'SILVER' | 'GOLD', number> = {
  BRONZE: 200,
  SILVER: 400,
  GOLD: 700,
};
