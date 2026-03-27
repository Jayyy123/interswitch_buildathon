import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';

const PLAN_WEEKLY_AMOUNTS: Record<string, number> = {
  BRONZE: 200,
  SILVER: 400,
  GOLD:   700,
};

const PLAN_COVERAGE_LIMITS: Record<string, number> = {
  BRONZE:  75_000,
  SILVER: 150_000,
  GOLD:   300_000,
};

export interface EnrollMemberItem {
  fullName: string;
  phoneNumber: string;
  bvn: string;
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {}

  // ─── Single + Bulk Enrollment ─────────────────────────────────────────────

  /**
   * POST /associations/:id/members/enroll
   *
   * Handles both single (array of 1) and bulk (array of N).
   * Flow:
   *  1. Validate association ownership
   *  2. For each row: deduplicate BVN, create Member with status=PAUSED, walletStatus=PENDING
   *  3. Send enrollment SMS immediately
   *  4. Return 200 with results array
   *  5. Background: provision wallet for each new member, send wallet SMS when done
   */
  async enrollMembers(associationId: string, members: EnrollMemberItem[], iyalojaUserId: string) {
    const association = await this.prisma.association.findFirst({
      where: { id: associationId, userId: iyalojaUserId },
    });
    if (!association) throw new NotFoundException('Association not found or not yours');

    const weeklyAmount = PLAN_WEEKLY_AMOUNTS[association.plan] ?? 400;
    const startDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const results: Array<{
      index: number;
      fullName: string;
      phoneNumber: string;
      status: 'enrolled' | 'skipped' | 'failed';
      memberId?: string;
      reason?: string;
    }> = [];

    const newMemberIds: string[] = [];

    for (let i = 0; i < members.length; i++) {
      const row = members[i];
      try {
        // Normalise phone
        const phone = row.phoneNumber.trim();

        // Duplicate check
        const existing = await this.prisma.member.findUnique({
          where: { associationId_bvn: { associationId, bvn: row.bvn } },
        });
        if (existing) {
          results.push({ index: i, fullName: row.fullName, phoneNumber: phone, status: 'skipped', reason: 'Already enrolled' });
          continue;
        }

        // BVN lookup (best-effort — fall back to provided fullName)
        let resolvedName = row.fullName;
        try {
          const bvnDetails = await this.interswitch.lookupBvn(row.bvn);
          const fromBvn = [bvnDetails.firstName, bvnDetails.lastName].filter(Boolean).join(' ');
          if (fromBvn) resolvedName = fromBvn;
        } catch {
          this.logger.warn(`BVN lookup failed for ${row.bvn} — using provided name`);
        }

        // Create member: status=PAUSED, walletStatus=PENDING
        const member = await this.prisma.member.create({
          data: {
            associationId,
            bvn: row.bvn,
            phone,
            name: resolvedName,
            status: MemberStatus.PAUSED,  // active once wallet funded
            walletStatus: 'PENDING',
            waitingPeriodStart: new Date(),
            enrolledAt: new Date(),
          },
        });
        newMemberIds.push(member.id);

        // Enrollment SMS (sent immediately — no wallet details yet)
        await this.termii.sendEnrollmentSms(
          phone,
          association.name,
          association.plan,
          weeklyAmount,
          startDate,
        );

        results.push({ index: i, fullName: resolvedName, phoneNumber: phone, status: 'enrolled', memberId: member.id });
      } catch (err: any) {
        this.logger.error(`Enrollment failed for row ${i} (${row.phoneNumber}): ${err?.message}`);
        results.push({ index: i, fullName: row.fullName, phoneNumber: row.phoneNumber, status: 'failed', reason: err?.message ?? 'Unknown error' });
      }
    }

    const enrolled = results.filter((r) => r.status === 'enrolled').length;
    const skipped  = results.filter((r) => r.status === 'skipped').length;
    const failed   = results.filter((r) => r.status === 'failed').length;

    // Fire background wallet provisioning — don't await, return 200 immediately
    if (newMemberIds.length > 0) {
      void Promise.resolve().then(() =>
        this._provisionWalletsInBackground(newMemberIds, association.name, association.plan, weeklyAmount)
          .catch((err) => this.logger.error('Background wallet provisioning crashed', err?.message)),
      );
    }

    return {
      total: members.length,
      enrolled,
      skipped,
      failed,
      results,
      message: enrolled > 0 ? `${enrolled} member(s) enrolled. Wallet setup running in background.` : 'No new members enrolled.',
    };
  }

  // ─── Background wallet provisioning ──────────────────────────────────────

  private async _provisionWalletsInBackground(
    memberIds: string[],
    associationName: string,
    plan: string,
    weeklyAmount: number,
  ): Promise<void> {
    for (const memberId of memberIds) {
      await this._provisionWalletForMember(memberId, associationName, plan, weeklyAmount);
    }
  }

  async _provisionWalletForMember(
    memberId: string,
    associationName: string,
    plan: string,
    weeklyAmount: number,
  ): Promise<void> {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return;

    await this.prisma.member.update({
      where: { id: memberId },
      data: { walletStatus: 'PROVISIONING' },
    });

    try {
      // Wallet creation via merchant-wallet API — VA (Wema Bank account) is returned inline
      const wallet = await this.interswitch.createMemberWallet(
        member.name ?? member.phone,
        member.phone,
        `member-${member.id}@omohealth.ng`,
      );

      // wallet.settlementAccountNumber = Wema Bank VA account number (from virtualAccount in response)
      // wallet.bankName = 'Wema Bank' (from virtualAccount.bankName in response)

      // Persist wallet details — member is now ACTIVE
      await this.prisma.member.update({
        where: { id: memberId },
        data: {
          walletId: wallet.walletId,
          walletAccountNumber: wallet.settlementAccountNumber,
          walletStatus: 'ACTIVE',
          status: MemberStatus.ACTIVE,
        },
      });

      // Create/update Wallet record for balance tracking
      await this.prisma.wallet.upsert({
        where: { memberId },
        create: { memberId, interswitchRef: wallet.settlementAccountNumber, balance: 0 },
        update: { interswitchRef: wallet.settlementAccountNumber },
      });

      this.logger.log(`Wallet provisioned for member ${memberId}: ${wallet.walletId} | VA: ${wallet.settlementAccountNumber}`);

      // Wallet setup SMS — send exact account number and bank name
      await this.termii.sendWalletSetupSms(
        member.phone,
        member.name ?? 'Member',
        wallet.settlementAccountNumber,
        wallet.bankName ?? 'Wema Bank',
        weeklyAmount,
      );
    } catch (err) {
      this.logger.error(`Wallet provisioning failed for member ${memberId}: ${err?.message}`);
      await this.prisma.member.update({
        where: { id: memberId },
        data: { walletStatus: 'FAILED' },
      });
    }
  }

  // ─── Retry wallet for failed members ─────────────────────────────────────

  async retryWallet(associationId: string, memberId: string, iyalojaUserId: string) {
    // Verify association ownership
    const association = await this.prisma.association.findFirst({
      where: { id: associationId, userId: iyalojaUserId },
    });
    if (!association) throw new NotFoundException('Association not found or not yours');

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, associationId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.walletStatus === 'ACTIVE') {
      throw new BadRequestException('Wallet is already active for this member');
    }

    const weeklyAmount = PLAN_WEEKLY_AMOUNTS[association.plan] ?? 400;

    // Reset status and re-provision in background
    await this.prisma.member.update({
      where: { id: memberId },
      data: { walletStatus: 'PENDING' },
    });

    void Promise.resolve().then(() =>
      this._provisionWalletForMember(memberId, association.name, association.plan, weeklyAmount)
        .catch((err) => this.logger.error(`Retry wallet failed for ${memberId}`, err?.message)),
    );

    return { message: 'Wallet provisioning queued. SMS will be sent when ready.' };
  }

  // ─── Coverage check (public — used by members and clinic portal) ──────────

  async getMemberCoverage(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        association: { select: { name: true, plan: true, poolBalance: true, monthlyDues: true, coverageLimit: true } },
        wallet: { select: { interswitchRef: true, balance: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const limit = member.association.coverageLimit ?? PLAN_COVERAGE_LIMITS[member.association.plan] ?? 75_000;

    return {
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      status: member.status,
      walletStatus: member.walletStatus,
      plan: member.association.plan,
      association: member.association.name,
      walletId: member.walletId ?? null,
      walletAccountNumber: member.walletAccountNumber ?? null,
      bankAccount: member.wallet ? { accountNumber: member.wallet.interswitchRef, balance: member.wallet.balance } : null,
      coverageLimit: limit,
      coverageUsed: member.coverageUsedThisYear,
      coverageRemaining: Math.max(0, limit - member.coverageUsedThisYear),
      enrolledAt: member.enrolledAt,
    };
  }
}
