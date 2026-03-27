// build: 2026-03-27T15:54-bullmq-redis-fix
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ClaimStatus } from '@prisma/client';

import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import {
  ClaimPayoutJobData,
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

  async process(job: Job<ClaimPayoutJobData>): Promise<void> {
    if (job.name !== PayoutJobName.PROCESS_CLAIM_PAYOUT) return;

    const {
      claimId,
      approvedAmount,
      memberId,
      memberName,
      memberPhone,
      associationId,
      clinicName,
      clinicBankAccount,
      clinicBankCode,
    } = job.data;

    this.logger.log(
      `Processing payout for claim ${claimId} — ₦${approvedAmount}`,
    );

    try {
      const payout = await this.interswitch.payoutToHospital(
        claimId,
        approvedAmount,
        memberName ?? 'Member',
        clinicName,
        clinicBankAccount,
        clinicBankCode,
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
        `Claim ${claimId} paid ₦${approvedAmount} → ${clinicName}`,
      );
    } catch (err) {
      this.logger.error(
        `Payout failed for claim ${claimId}`,
        (err as Error)?.message,
      );
      await this.prisma.claim.update({
        where: { id: claimId },
        data: { status: ClaimStatus.FAILED },
      });
      // Re-throw — BullMQ will retry per queue config (5x exponential backoff)
      throw err;
    }
  }
}
