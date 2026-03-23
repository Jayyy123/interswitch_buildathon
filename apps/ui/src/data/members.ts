export type MemberStatus = 'active' | 'paused' | 'removed';
export type PaymentMethod = 'wallet' | 'cash' | 'card';
export type ContributionStatus = 'success' | 'failed' | 'cash';

export type Member = {
  id: string;
  fullName: string;
  phone: string;
  bvn: string;
  status: MemberStatus;
  paymentMethod: PaymentMethod;
  contributionStreak: string;
  coverageUsedThisYear: string;
  consecutiveMissedPayments: number;
  joinedAt: string;
  walletId: string;
  walletAccountNumber: string;
  walletBalance: string;
  bankCode: string;
  recentContributions: Array<{ week: string; amount: string; status: ContributionStatus }>;
};

export const MEMBERS: Member[] = [
  {
    id: 'MEM-001',
    fullName: 'Kemi Adesina',
    phone: '0803 555 1000',
    bvn: '22334455667',
    status: 'active',
    paymentMethod: 'wallet',
    contributionStreak: '9 weeks',
    coverageUsedThisYear: 'N 90,000',
    consecutiveMissedPayments: 0,
    joinedAt: '2025-02-10',
    walletId: 'WLT-MEM-001',
    walletAccountNumber: '0034567811',
    walletBalance: 'N 34,500',
    bankCode: '011',
    recentContributions: [
      { week: '2026-W10', amount: 'N 6,000', status: 'success' },
      { week: '2026-W09', amount: 'N 6,000', status: 'success' },
      { week: '2026-W08', amount: 'N 6,000', status: 'success' },
    ],
  },
  {
    id: 'MEM-002',
    fullName: 'Tunde Lawal',
    phone: '0802 111 2345',
    bvn: '77665544332',
    status: 'paused',
    paymentMethod: 'cash',
    contributionStreak: '2 weeks',
    coverageUsedThisYear: 'N 20,000',
    consecutiveMissedPayments: 2,
    joinedAt: '2025-03-04',
    walletId: 'WLT-MEM-002',
    walletAccountNumber: '0034567812',
    walletBalance: 'N 5,000',
    bankCode: '058',
    recentContributions: [
      { week: '2026-W10', amount: 'N 6,000', status: 'cash' },
      { week: '2026-W09', amount: 'N 6,000', status: 'failed' },
      { week: '2026-W08', amount: 'N 6,000', status: 'cash' },
    ],
  },
  {
    id: 'MEM-003',
    fullName: 'Amaka Obi',
    phone: '0706 552 3300',
    bvn: '33445566778',
    status: 'active',
    paymentMethod: 'wallet',
    contributionStreak: '9 weeks',
    coverageUsedThisYear: 'N 40,000',
    consecutiveMissedPayments: 0,
    joinedAt: '2025-01-20',
    walletId: 'WLT-MEM-003',
    walletAccountNumber: '0034567813',
    walletBalance: 'N 42,000',
    bankCode: '011',
    recentContributions: [
      { week: '2026-W10', amount: 'N 6,000', status: 'success' },
      { week: '2026-W09', amount: 'N 6,000', status: 'success' },
      { week: '2026-W08', amount: 'N 6,000', status: 'success' },
    ],
  },
  {
    id: 'MEM-004',
    fullName: 'Binta Yusuf',
    phone: '0814 777 0821',
    bvn: '44556677889',
    status: 'active',
    paymentMethod: 'card',
    contributionStreak: '4 weeks',
    coverageUsedThisYear: 'N 0',
    consecutiveMissedPayments: 0,
    joinedAt: '2025-12-01',
    walletId: 'WLT-MEM-004',
    walletAccountNumber: '0034567814',
    walletBalance: 'N 18,000',
    bankCode: '044',
    recentContributions: [
      { week: '2026-W10', amount: 'N 6,000', status: 'success' },
      { week: '2026-W09', amount: 'N 6,000', status: 'success' },
      { week: '2026-W08', amount: 'N 6,000', status: 'failed' },
    ],
  },
  {
    id: 'MEM-005',
    fullName: 'Ngozi Eze',
    phone: '0809 220 1133',
    bvn: '66778899001',
    status: 'removed',
    paymentMethod: 'wallet',
    contributionStreak: '0 weeks',
    coverageUsedThisYear: 'N 120,000',
    consecutiveMissedPayments: 5,
    joinedAt: '2024-11-15',
    walletId: 'WLT-MEM-005',
    walletAccountNumber: '0034567815',
    walletBalance: 'N 0',
    bankCode: '011',
    recentContributions: [
      { week: '2026-W10', amount: 'N 0', status: 'failed' },
      { week: '2026-W09', amount: 'N 6,000', status: 'failed' },
      { week: '2026-W08', amount: 'N 6,000', status: 'failed' },
    ],
  },
  {
    id: 'MEM-006',
    fullName: 'Segun Musa',
    phone: '0703 110 2212',
    bvn: '99001122334',
    status: 'active',
    paymentMethod: 'cash',
    contributionStreak: '6 weeks',
    coverageUsedThisYear: 'N 15,000',
    consecutiveMissedPayments: 0,
    joinedAt: '2025-04-08',
    walletId: 'WLT-MEM-006',
    walletAccountNumber: '0034567816',
    walletBalance: 'N 11,000',
    bankCode: '033',
    recentContributions: [
      { week: '2026-W10', amount: 'N 6,000', status: 'cash' },
      { week: '2026-W09', amount: 'N 6,000', status: 'cash' },
      { week: '2026-W08', amount: 'N 6,000', status: 'success' },
    ],
  },
];
