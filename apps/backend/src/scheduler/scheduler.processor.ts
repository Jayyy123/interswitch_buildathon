import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  ContributionSource,
  ContributionStatus,
  MemberStatus,
} from '@prisma/client';
import { Job } from 'bullmq';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import { WEEKLY_DEBIT_QUEUE } from './scheduler.queue';

const PLAN_WEEKLY_AMOUNTS: Record<string, number> = {
  BRONZE: 200,
  SILVER: 400,
  GOLD: 700,
};

@Processor(WEEKLY_DEBIT_QUEUE)
export class WeeklyDebitProcessor extends WorkerHost {
  private readonly logger = new Logger(WeeklyDebitProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing weekly debit job ${job.id}...`);

    const monday = this.getLastMonday();

    // Fetch all ACTIVE members with a provisioned wallet
    const members = await this.prisma.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        walletStatus: 'ACTIVE',
        walletId: { not: null },
      },
      include: {
        association: {
          select: { id: true, name: true, plan: true, poolBalance: true },
        },
      },
    });

    this.logger.log(`Found ${members.length} active members to debit`);
    let success = 0;
    let failed = 0;

    for (const member of members) {
      const weeklyAmount = PLAN_WEEKLY_AMOUNTS[member.association.plan] ?? 400;
      const reference = `OMOH-WEEKLY-${member.id}-${monday.toISOString().slice(0, 10)}`;

      // Idempotency — skip if already processed this week
      const existing = await this.prisma.contribution.findFirst({
        where: { memberId: member.id, week: monday },
      });
      if (existing) continue;

      let debitResult: {
        success: boolean;
        responseCode: string;
        responseMessage: string;
      };
      try {
        debitResult = await this.interswitch.debitMemberWallet(
          member.walletId!,
          weeklyAmount,
          reference,
          `OmoHealth weekly contribution – ${member.association.name}`,
        );
      } catch (err) {
        debitResult = {
          success: false,
          responseCode: 'ERROR',
          responseMessage: err?.message ?? 'ISW unreachable',
        };
      }

      if (debitResult.success) {
        // ── SUCCESS ─────────────────────────────────────────────────────────
        await this.prisma.$transaction([
          this.prisma.contribution.create({
            data: {
              memberId: member.id,
              associationId: member.associationId,
              amount: weeklyAmount,
              source: ContributionSource.DIRECT_DEBIT,
              status: ContributionStatus.SUCCESS,
              interswitchRef: reference,
              week: monday,
            },
          }),
          this.prisma.association.update({
            where: { id: member.associationId },
            data: { poolBalance: { increment: weeklyAmount } },
          }),
          this.prisma.member.update({
            where: { id: member.id },
            data: { consecutiveMissedPayments: 0 },
          }),
        ]);

        await this.termii.sendContributionConfirmedSms(
          member.phone,
          this.getWeekNumber(monday),
          weeklyAmount,
          member.association.poolBalance + weeklyAmount,
        );
        success++;
      } else {
        // ── FAILED ──────────────────────────────────────────────────────────
        const newMissed = (member.consecutiveMissedPayments ?? 0) + 1;
        const shouldPause = newMissed >= 3;

        await this.prisma.$transaction([
          this.prisma.contribution.create({
            data: {
              memberId: member.id,
              associationId: member.associationId,
              amount: weeklyAmount,
              source: ContributionSource.DIRECT_DEBIT,
              status: ContributionStatus.FAILED,
              interswitchRef: reference,
              week: monday,
            },
          }),
          this.prisma.member.update({
            where: { id: member.id },
            data: {
              consecutiveMissedPayments: newMissed,
              ...(shouldPause && { status: MemberStatus.PAUSED }),
            },
          }),
        ]);

        await this.termii.sendDebitFailedSms(
          member.phone,
          weeklyAmount,
          member.walletAccountNumber ?? member.walletId ?? '',
        );

        if (shouldPause) {
          await this.termii.sendCoveragePausedSms(
            member.phone,
            member.name ?? 'Member',
          );
        }
        failed++;
      }
    }

    this.logger.log(
      `Weekly debit complete: ${success} succeeded, ${failed} failed`,
    );
    await job.updateProgress(100);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts`,
      err.message,
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private getLastMonday(): Date {
    const now = new Date();
    const dow = now.getUTCDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }
}
