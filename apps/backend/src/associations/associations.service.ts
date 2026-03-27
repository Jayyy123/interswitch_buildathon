import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { PlanTier, UserRole } from '@prisma/client';
import { Queue } from 'bullmq';
import { toLocal } from '../common/phone.util';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import { PROVISION_POOL_WALLET, WALLET_PROVISION_QUEUE } from '../wallet-provision/wallet-provision.queue';
import {
  PROVISION_POOL_WALLET,
  WALLET_PROVISION_QUEUE,
} from '../wallet-provision/wallet-provision.queue';
import {
  ClaimsQueryDto,
  CreateAssociationDto,
  MembersQueryDto,
  TransactionsQueryDto,
  UpdateAssociationDto,
  VerifyPaymentDto,
} from './dto/associations.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_WEEKLY_AMOUNTS: Record<string, number> = {
  BRONZE: 200,
  SILVER: 400,
  GOLD: 700,
};

const PLAN_COVERAGE_LIMITS: Record<string, number> = {
  BRONZE: 75_000,
  SILVER: 150_000,
  GOLD: 300_000,
};

function paginate(page?: string, limit?: string) {
  const p = Math.max(1, parseInt(page ?? '1', 10));
  const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10)));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}

@Injectable()
export class AssociationsService {
  private readonly logger = new Logger(AssociationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
    @InjectQueue(WALLET_PROVISION_QUEUE)
    private readonly walletQueue: Queue,
  ) {
    walletQueue.on('error', (err) =>
      this.logger.warn('Wallet queue error:', err.message),
    );
  }

  // ─── Create association ────────────────────────────────────────────────────

  async createAssociation(
    dto: CreateAssociationDto,
    userId: string,
    jwtPhone?: string,
  ) {
    let user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user && jwtPhone) {
      user = await this.prisma.user.findUnique({ where: { phone: jwtPhone } });
    }
    if (!user && jwtPhone) {
      user = await this.prisma.user.create({
        data: { phone: jwtPhone, role: UserRole.IYALOJA },
      });
    }
    if (!user)
      throw new UnauthorizedException('Invalid session. Please login again.');

    const association = await this.prisma.association.create({
      data: {
        userId: user.id,
        name: dto.name,
        cacNumber: dto.cacNumber,
        plan: (dto.plan as PlanTier) ?? PlanTier.BRONZE,
        monthlyDues: dto.monthlyDues,
        coverageLimit: dto.coverageLimit,
        poolBalance: 0,
      },
    });

    // Enqueue pool wallet provisioning via BullMQ — retries on ETIMEDOUT automatically
    const assocDigits = association.id
      .replace(/[^0-9]/g, '')
      .padEnd(7, '0')
      .slice(0, 7);
    const poolPhone = `0803${assocDigits}`;
    try {
      await this.walletQueue.add(
        PROVISION_POOL_WALLET,
        {
          associationId: association.id,
          name: `${dto.name} Pool`,
          phone: poolPhone,
          email: `pool-${association.id}@omohealth.ng`,
        },
        {
          jobId: `pool-wallet-${association.id}`,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Pool wallet job not queued (Redis unavailable): ${err?.message}`,
      );
    }

    return this.prisma.association.findUnique({
      where: { id: association.id },
    });
  }

  // ─── List associations (role-aware) ───────────────────────────────────────

  async listAssociations(userId: string, role: string) {
    if (role === 'IYALOJA') {
      const associations = await this.prisma.association.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          cacNumber: true,
          plan: true,
          monthlyDues: true,
          coverageLimit: true,
          walletId: true,
          walletAccountNumber: true,
          poolBalance: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return associations.map((a) => ({
        ...a,
        memberCount: a._count.members,
        userRole: 'OWNER',
        _count: undefined,
      }));
    }

    if (role === 'MEMBER') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });
      if (!user) return [];
      const localPhone = toLocal(user.phone);
      const members = await this.prisma.member.findMany({
        where: { phone: { in: [user.phone, localPhone] } },
        select: {
          id: true,
          status: true,
          walletId: true,
          walletAccountNumber: true,
          association: {
            select: {
              id: true,
              name: true,
              plan: true,
              poolBalance: true,
              walletId: true,
            },
          },
        },
      });
      return members.map((m) => ({
        ...m.association,
        memberStatus: m.status,
        memberId: m.id,
        walletId: m.walletId,
        walletAccountNumber: m.walletAccountNumber,
        userRole: 'MEMBER',
      }));
    }

    return [];
  }

  // ─── Dashboard stats (lean — no arrays) ───────────────────────────────────

  async getDashboard(id: string, userId: string) {
    const association = await this._ownerOrThrow(id, userId);

    const [activeCount, pausedCount, flaggedCount, totalPaidOut] =
      await Promise.all([
        this.prisma.member.count({
          where: { associationId: id, status: 'ACTIVE' },
        }),
        this.prisma.member.count({
          where: { associationId: id, status: 'PAUSED' },
        }),
        this.prisma.member.count({
          where: { associationId: id, consecutiveMissedPayments: { gte: 3 } },
        }),
        this.prisma.claim.aggregate({
          where: { associationId: id, status: 'PAID' },
          _sum: { approvedAmount: true },
        }),
      ]);

    // Next Monday at 07:00 WAT
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    const nextDebit = new Date(now);
    nextDebit.setDate(now.getDate() + daysUntilMonday);
    nextDebit.setHours(7, 0, 0, 0);

    return {
      poolBalance: association.poolBalance,
      activeMemberCount: activeCount,
      pausedMemberCount: pausedCount,
      flaggedMemberCount: flaggedCount,
      totalPaidOut: totalPaidOut._sum.approvedAmount ?? 0,
      nextDebitDate: nextDebit.toISOString(),
      plan: association.plan,
      name: association.name,
    };
  }

  // ─── Wallet details ────────────────────────────────────────────────────────

  async getWallet(id: string, userId: string) {
    const association = await this._ownerOrThrow(id, userId);
    const weeklyTarget = await this.prisma.member.count({
      where: { associationId: id, status: 'ACTIVE' },
    });
    const weeklyAmount = PLAN_WEEKLY_AMOUNTS[association.plan] ?? 400;

    // Contributions collected this current Monday-Sunday window
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const collectedThisWeek = await this.prisma.contribution.aggregate({
      where: {
        associationId: id,
        status: 'SUCCESS',
        createdAt: { gte: monday },
      },
      _sum: { amount: true },
    });

    return {
      walletId: association.walletId,
      walletAccountNumber: association.walletAccountNumber,
      poolBalance: association.poolBalance,
      weeklyTarget: weeklyTarget * weeklyAmount,
      collectedThisWeek: collectedThisWeek._sum.amount ?? 0,
      weeklyAmountPerMember: weeklyAmount,
    };
  }

  async updateAssociation(
    id: string,
    dto: UpdateAssociationDto,
    userId: string,
  ) {
    await this._ownerOrThrow(id, userId);

    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.cacNumber !== undefined) data.cacNumber = dto.cacNumber;
    if (dto.plan !== undefined) data.plan = dto.plan as PlanTier;
    if (dto.monthlyDues !== undefined) data.monthlyDues = dto.monthlyDues;
    if (dto.coverageLimit !== undefined) data.coverageLimit = dto.coverageLimit;

    if (Object.keys(data).length === 0) {
      throw new ForbiddenException('No fields to update.');
    }

    return this.prisma.association.update({
      where: { id },
      data,
    });
  }

  // ─── Members list (paginated + filtered) ──────────────────────────────────

  async getMembers(id: string, userId: string, query: MembersQueryDto) {
    await this._ownerOrThrow(id, userId);
    const { skip, take, page, limit } = paginate(query.page, query.limit);

    const where: Record<string, any> = { associationId: id };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          walletStatus: true,
          walletId: true,
          walletAccountNumber: true,
          consecutiveMissedPayments: true,
          enrolledAt: true,
        },
        orderBy: { enrolledAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Single member detail ─────────────────────────────────────────────────

  async getMember(id: string, memberId: string, userId: string) {
    await this._ownerOrThrow(id, userId);

    const member = await this.prisma.member.findFirst({
      where: { id: memberId, associationId: id },
      include: {
        contributions: {
          select: {
            id: true,
            amount: true,
            status: true,
            source: true,
            week: true,
          },
          orderBy: { week: 'desc' },
          take: 10,
        },
        wallet: { select: { interswitchRef: true, balance: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    // Contribution streak: consecutive weeks from latest
    const streak = this._calcStreak(member.contributions);

    return {
      id: member.id,
      name: member.name,
      phone: member.phone,
      bvn: member.bvn,
      status: member.status,
      walletStatus: member.walletStatus,
      walletId: member.walletId,
      walletAccountNumber: member.walletAccountNumber,
      bankAccount: member.wallet
        ? {
            accountNumber: member.wallet.interswitchRef,
            balance: member.wallet.balance,
          }
        : null,
      coverageUsedThisYear: member.coverageUsedThisYear,
      consecutiveMissedPayments: member.consecutiveMissedPayments,
      contributionStreak: streak,
      enrolledAt: member.enrolledAt,
      recentContributions: member.contributions,
    };
  }

  // ─── Claims list (paginated + filtered) ───────────────────────────────────

  async getClaims(id: string, userId: string, query: ClaimsQueryDto) {
    await this._ownerOrThrow(id, userId);
    const { skip, take, page, limit } = paginate(query.page, query.limit);

    const where: Record<string, any> = { associationId: id };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.claim.findMany({
        where,
        select: {
          id: true,
          hospitalName: true,
          billAmount: true,
          approvedAmount: true,
          status: true,
          description: true,
          createdAt: true,
          member: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.claim.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getClaimById(id: string, claimId: string, userId: string) {
    const association = await this._ownerOrThrow(id, userId);
    const claim = await this.prisma.claim.findFirst({
      where: { id: claimId, associationId: id },
      select: {
        id: true,
        hospitalName: true,
        billAmount: true,
        approvedAmount: true,
        status: true,
        description: true,
        billPhotoUrl: true,
        createdAt: true,
        member: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    return {
      ...claim,
      association: { id: association.id, name: association.name },
    };
  }

  // ─── Transactions list (paginated + filtered) ─────────────────────────────

  async getTransactions(
    id: string,
    userId: string,
    query: TransactionsQueryDto,
  ) {
    await this._ownerOrThrow(id, userId);
    const { skip, take, page, limit } = paginate(query.page, query.limit);

    const where: Record<string, any> = { associationId: id };
    if (query.source) where.source = query.source;
    if (query.week) {
      const weekStart = new Date(query.week);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      where.week = { gte: weekStart, lt: weekEnd };
    }

    const [data, total] = await Promise.all([
      this.prisma.contribution.findMany({
        where,
        select: {
          id: true,
          amount: true,
          status: true,
          source: true,
          week: true,
          createdAt: true,
          member: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.contribution.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ─── Verify payment + credit pool ─────────────────────────────────────────

  async verifyAndCreditPool(id: string, dto: VerifyPaymentDto, userId: string) {
    const association = await this._ownerOrThrow(id, userId);

    const result = await this.interswitch.verifyPayment(
      dto.transactionReference,
      dto.amountKobo,
    );
    if (!result.success) {
      return {
        success: false,
        message: `Payment verification failed (code: ${result.responseCode})`,
      };
    }

    const amountNaira = dto.amountKobo / 100;
    await this.prisma.association.update({
      where: { id },
      data: { poolBalance: { increment: amountNaira } },
    });

    return {
      success: true,
      credited: amountNaira,
      newBalance: association.poolBalance + amountNaira,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async _ownerOrThrow(id: string, userId: string) {
    const association = await this.prisma.association.findFirst({
      where: { id, userId },
    });
    if (!association)
      throw new NotFoundException('Association not found or not yours');
    return association;
  }

  private _calcStreak(contributions: Array<{ status: string }>): number {
    let streak = 0;
    for (const c of contributions) {
      if (c.status === 'SUCCESS') streak++;
      else break;
    }
    return streak;
  }
}
