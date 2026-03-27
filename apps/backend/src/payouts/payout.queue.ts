export const PAYOUT_QUEUE = 'payout';

export const PayoutJobName = {
  PROCESS_CLAIM_PAYOUT: 'process-claim-payout',
} as const;

export interface ClaimPayoutJobData {
  claimId: string;
  approvedAmount: number;
  memberId: string;
  memberName: string | null;
  memberPhone: string | null;
  associationId: string;
  clinicName: string;
  clinicBankAccount: string;
  clinicBankCode: string;
}
