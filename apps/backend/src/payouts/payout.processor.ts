// build: 2026-03-27T23:45-async-wallet-provision
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClaimStatus } from '@prisma/client';

import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import {
  ClaimPayoutJobData,
  ClinicWalletProvisionJobData,
  PAYOUT_QUEUE,
  PayoutJobName,
} from './payout.queue';

@Processor(PAYOUT_QUEUE)
export class PayoutProcessor extends WorkerHost {
  private readonly logger = new Logger(PayoutProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {
    super();
  }

  async process(
    job: Job<ClaimPayoutJobData | ClinicWalletProvisionJobData>,
  ): Promise<void> {
    if (job.name === PayoutJobName.PROVISION_CLINIC_WALLET) {
      return this.provisionClinicWallet(
        job as Job<ClinicWalletProvisionJobData>,
      );
    }
    if (job.name === PayoutJobName.PROCESS_CLAIM_PAYOUT) {
      return this.processClaimPayout(job as Job<ClaimPayoutJobData>);
    }
  }

  // ─── Wallet provisioning ───────────────────────────────────────────────────

  private async provisionClinicWallet(
    job: Job<ClinicWalletProvisionJobData>,
  ): Promise<void> {
    const { clinicId, clinicName, adminPhone, adminUserId } = job.data;
    this.logger.log(
      `Provisioning wallet for clinic "${clinicName}" (${clinicId})`,
    );

    const wallet = await this.interswitch.createMemberWallet(
      clinicName,
      adminPhone,
      `clinic+${adminUserId}@omohealth.ng`,
    );

    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        walletId: wallet.walletId,
        walletAccountNumber: wallet.settlementAccountNumber,
        walletBankName: wallet.bankName,
      },
    });

    this.logger.log(
      `Wallet provisioned for clinic "${clinicName}": ${wallet.walletId} / ${wallet.settlementAccountNumber}`,
    );
  }

  // ─── Claim payout ──────────────────────────────────────────────────────────

  private async processClaimPayout(
    job: Job<ClaimPayoutJobData>,
  ): Promise<void> {
    const {
      claimId,
      approvedAmount,
      memberId,
      memberName,
      memberPhone,
      associationId,
      clinicName,
      clinicWalletId,
    } = job.data;

    this.logger.log(
      `Processing payout for claim ${claimId} — ₦${approvedAmount} → clinic wallet ${clinicWalletId}`,
    );

    const payout = await this.interswitch.payoutToHospital(
      claimId,
      approvedAmount,
      memberName ?? 'Member',
      clinicName,
      '',
      '',
      clinicWalletId,
    );

    await Promise.all([
      this.prisma.association.update({
        where: { id: associationId },
        data: { poolBalance: { decrement: approvedAmount } },
      }),
      this.prisma.member.update({
        where: { id: memberId },
        data: { coverageUsedThisYear: { increment: approvedAmount } },
      }),
      this.prisma.claim.update({
        where: { id: claimId },
        data: {
          status: ClaimStatus.PAID,
          interswitchRef: payout.transactionReference,
          otpVerified: true,
        },
      }),
    ]);

    if (memberPhone) {
      await this.termii.sendClaimConfirmed(
        memberPhone,
        memberName ?? 'Member',
        approvedAmount,
        clinicName,
      );
    }

    this.logger.log(
      `Claim ${claimId} paid ₦${approvedAmount} → ${clinicName} (wallet: ${clinicWalletId})`,
    );
  }
}
