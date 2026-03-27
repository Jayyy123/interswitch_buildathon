import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ClaimStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicService } from '../clinic/clinic.service';
import { toE164 } from '../common/phone.util';
import { SubmitClaimDto } from './dto/claims.dto';
import {
  ClaimPayoutJobData,
  PAYOUT_QUEUE,
  PayoutJobName,
} from '../payouts/payout.queue';

const PLAN_LIMITS: Record<string, number> = {
  BRONZE: 75_000,
  SILVER: 150_000,
  GOLD: 300_000,
};

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicService: ClinicService,
    @InjectQueue(PAYOUT_QUEUE)
    private readonly payoutQueue: Queue<ClaimPayoutJobData>,
  ) {}

  // ─── Member lookup ───────────────────────────────────────────────────────────

  async lookupMember(rawPhone: string) {
    const phone = toE164(rawPhone);

    const member = await this.prisma.member.findFirst({
      where: { phone },
      include: { association: true },
      orderBy: { enrolledAt: 'desc' },
    });

    if (!member)
      throw new NotFoundException('No member found with this phone number');

    const coverageLimit =
      member.association.coverageLimit ??
      PLAN_LIMITS[member.association.plan] ??
      75_000;

    return {
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      status: member.status,
      association: member.association.name,
      associationId: member.associationId,
      plan: member.association.plan,
      coverageLimit,
      coverageUsed: member.coverageUsedThisYear,
      coverageRemaining: Math.max(
        0,
        coverageLimit - member.coverageUsedThisYear,
      ),
    };
  }

  // ─── Submit claim ────────────────────────────────────────────────────────────

  async submitClaim(dto: SubmitClaimDto, userId: string) {
    const admin = await this.clinicService.getClinicAdmin(userId);
    const { clinic } = admin;

    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
      include: { association: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Member coverage is ${member.status}. Claims cannot be submitted.`,
      );
    }
    if (member.associationId !== dto.associationId) {
      throw new BadRequestException(
        'Member does not belong to the specified association',
      );
    }

    const coverageLimit =
      member.association.coverageLimit ??
      PLAN_LIMITS[member.association.plan] ??
      75_000;
    const coverageRemaining = Math.max(
      0,
      coverageLimit - member.coverageUsedThisYear,
    );
    const approvedAmount = Math.min(dto.billAmount, coverageRemaining);

    if (approvedAmount <= 0) {
      throw new BadRequestException(
        `Member has exhausted their yearly coverage of ₦${coverageLimit.toLocaleString()}.`,
      );
    }
    if (member.association.poolBalance < approvedAmount) {
      throw new BadRequestException(
        `Insufficient pool balance (₦${member.association.poolBalance.toLocaleString()} available).`,
      );
    }

    const claim = await this.prisma.claim.create({
      data: {
        associationId: dto.associationId,
        memberId: dto.memberId,
        clinicId: clinic.id,
        clinicAdminId: admin.id,
        hospitalName: clinic.name,
        hospitalAccount: clinic.walletAccountNumber ?? null,
        hospitalBankCode: null,
        billAmount: dto.billAmount,
        approvedAmount,
        billPhotoUrl: dto.billPhotoUrl ?? null,
        description: dto.description ?? null,
        status: ClaimStatus.PENDING,
        otpVerified: false,
      },
    });

    if (clinic.walletId) {
      await this.payoutQueue.add(PayoutJobName.PROCESS_CLAIM_PAYOUT, {
        claimId: claim.id,
        approvedAmount,
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        associationId: dto.associationId,
        clinicName: clinic.name,
        clinicWalletId: clinic.walletId,
      } satisfies ClaimPayoutJobData);
      this.logger.log(`Payout job queued for claim ${claim.id}`);
    } else {
      this.logger.warn(
        `Claim ${claim.id}: clinic has no wallet — payout skipped`,
      );
    }

    return {
      claimId: claim.id,
      status: 'PENDING' as const,
      approvedAmount,
      message: 'Claim received. Payout is being processed.',
    };
  }

  // ─── List claims ─────────────────────────────────────────────────────────────

  async getClaims(userId: string) {
    const admin = await this.clinicService.getClinicAdmin(userId);

    return this.prisma.claim.findMany({
      where: { clinicId: admin.clinicId },
      include: {
        member: { select: { name: true, phone: true, status: true } },
        association: { select: { name: true, plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const admin = await this.clinicService.getClinicAdmin(userId);
    const clinicId = admin.clinicId;

    const [pending, paid, failed, totalAgg] = await Promise.all([
      this.prisma.claim.count({
        where: { clinicId, status: ClaimStatus.PENDING },
      }),
      this.prisma.claim.count({
        where: { clinicId, status: ClaimStatus.PAID },
      }),
      this.prisma.claim.count({
        where: { clinicId, status: ClaimStatus.FAILED },
      }),
      this.prisma.claim.aggregate({
        where: { clinicId, status: ClaimStatus.PAID },
        _sum: { approvedAmount: true },
      }),
    ]);

    return {
      pending,
      paid,
      failed,
      totalPaidOut: totalAgg._sum?.approvedAmount ?? 0,
    };
  }
}
