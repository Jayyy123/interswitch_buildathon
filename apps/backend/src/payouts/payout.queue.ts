export const PAYOUT_QUEUE = 'payout';

export const PayoutJobName = {
  PROCESS_CLAIM_PAYOUT: 'process-claim-payout',
  PROVISION_CLINIC_WALLET: 'provision-clinic-wallet',
} as const;

export interface ClaimPayoutJobData {
  claimId: string;
  approvedAmount: number;
  memberId: string;
  memberName: string | null;
  memberPhone: string | null;
  associationId: string;
  clinicName: string;
  clinicWalletId: string; // Interswitch merchant wallet ID
}

export interface ClinicWalletProvisionJobData {
  clinicId: string;
  clinicName: string;
  adminPhone: string;
  adminUserId: string;
}
