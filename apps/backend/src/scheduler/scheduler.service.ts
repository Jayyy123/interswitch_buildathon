import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ContributionSource,
  ContributionStatus,
  MemberStatus,
} from '@prisma/client';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';

const PLAN_WEEKLY_AMOUNTS: Record<string, number> = {
  BRONZE: 200,
  SILVER: 400,
  GOLD: 700,
};

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {}

  // ─── Weekly debit: runs every Monday at 08:00 WAT (07:00 UTC) ─────────────
  // Cron: '0 7 * * 1'
  //
  // Flow per member:
  //  1. Debit member wallet via merchant-wallet API (debitMemberWallet)
  //  2. On success (rc=00):
  //     - Create Contribution (status=SUCCESS)
  //     - Increment association.poolBalance
  //     - Reset consecutiveMissedPayments = 0
  //     - If member was PAUSED and now paying → set ACTIVE + send reactivation SMS
  //  3. On fail (rc=51 insufficient funds or any error):
  //     - Create Contribution (status=FAILED)
  //     - Increment consecutiveMissedPayments
  //     - If consecutiveMissedPayments >= 3 → set PAUSED + send coverage-paused SMS
  //     - Send debit-failed SMS

  @Cron('0 7 * * 1', {
    name: 'weekly_contribution_debit',
    timeZone: 'Africa/Lagos',
  })
  async runWeeklyContributionDebit(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Weekly debit already in progress — skipping');
      return;
    }
    this.isRunning = true;
    this.logger.log('Starting weekly contribution debit run...');

    const monday = this.getLastMonday();

    try {
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
        const weeklyAmount =
          PLAN_WEEKLY_AMOUNTS[member.association.plan] ?? 400;
        const reference = `OMOH-WEEKLY-${member.id}-${monday.toISOString().slice(0, 10)}`;

        // Idempotency: skip if already processed this week
        const existing = await this.prisma.contribution.findFirst({
          where: { memberId: member.id, week: monday },
        });
        if (existing) {
          this.logger.debug(
            `Member ${member.id} already processed for week ${monday.toISOString().slice(0, 10)}`,
          );
          continue;
        }

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
          // ── SUCCESS ──────────────────────────────────────────────────────
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

          const weekNumber = this.getWeekNumber(monday);
          await this.termii.sendContributionConfirmedSms(
            member.phone,
            weekNumber,
            weeklyAmount,
            member.association.poolBalance + weeklyAmount,
          );
          success++;
        } else {
          // ── FAILED ────────────────────────────────────────────────────────
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
    } catch (err) {
      this.logger.error('Weekly debit run crashed', err?.message);
    } finally {
      this.isRunning = false;
    }
  }

  // ─── Manual trigger ────────────────────────────────────────────────────────
  // Called by POST /scheduler/trigger-debit (admin only, for testing)

  async triggerManualDebit(): Promise<{ message: string }> {
    if (this.isRunning) {
      return { message: 'Debit run already in progress — check logs' };
    }
    void this.runWeeklyContributionDebit();
    return {
      message: 'Weekly debit triggered manually — check logs for progress',
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** ISO week number (1-53) */
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
    const dow = now.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
    const diff = dow === 0 ? -6 : 1 - dow; // go back to Monday
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }
}
