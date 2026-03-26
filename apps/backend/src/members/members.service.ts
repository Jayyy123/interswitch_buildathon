import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import { EnrollMemberDto } from './dto/members.dto';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {}

  /**
   * Full member enrollment flow:
   * 1. Verify association belongs to this Iyaloja
   * 2. BVN lookup → get verified name
   * 3. Duplicate BVN check
   * 4. Create Member record
   * 5. Create Interswitch merchant wallet (Member.walletId + walletAccountNumber)
   * 6. Create Wema Bank virtual account (Member.wallet → Wallet.interswitchRef)
   * 7. Send onboarding SMS with the Wema Bank account number to pay dues into
   */
  async enrollMember(dto: EnrollMemberDto, iyalojaUserId: string) {
    const association = await this.prisma.association.findFirst({
      where: { id: dto.associationId, userId: iyalojaUserId },
    });
    if (!association) throw new NotFoundException('Association not found or not yours');

    const existing = await this.prisma.member.findUnique({
      where: { associationId_bvn: { associationId: dto.associationId, bvn: dto.bvn } },
    });
    if (existing) throw new BadRequestException('This BVN is already enrolled in this association');

    // BVN lookup — returns real name from Interswitch Identity API
    // In QA sandbox this always fails (BVN must be linked to an ISW wallet),
    // so Iyaloja must provide dto.name as a fallback.
    let resolvedName: string | null = null;
    try {
      const bvnDetails = await this.interswitch.lookupBvn(dto.bvn);
      const fromBvn = [bvnDetails.firstName, bvnDetails.lastName].filter(Boolean).join(' ');
      if (fromBvn) resolvedName = fromBvn;
    } catch {
      // BVN lookup failed — will fall through to dto.name
    }

    if (!resolvedName && dto.name) {
      resolvedName = dto.name;
    }

    if (!resolvedName) {
      throw new BadRequestException(
        'Could not resolve member name via BVN. Please provide the member name in the request body.',
      );
    }

    const fullName = resolvedName;

    // Create member record
    const member = await this.prisma.member.create({
      data: {
        associationId: dto.associationId,
        bvn: dto.bvn,
        phone: dto.phone,
        name: fullName,
        status: MemberStatus.ACTIVE,
        waitingPeriodStart: new Date(),
        enrolledAt: new Date(),
      },
    });

    // ── Step 5: Create Interswitch merchant wallet (personal wallet for this member) ──
    let walletId: string | null = null;
    let walletAccountNumber: string | null = null;
    try {
      const wallet = await this.interswitch.createMemberWallet(
        fullName,
        dto.phone,
        dto.email ?? `member-${member.id}@omohealth.ng`,
      );
      walletId = wallet.walletId;
      walletAccountNumber = wallet.settlementAccountNumber;
      await this.prisma.member.update({
        where: { id: member.id },
        data: { walletId, walletAccountNumber },
      });
      this.logger.log(`Member wallet created: ${walletId} for member ${member.id}`);
    } catch (err) {
      this.logger.warn(`Member wallet creation failed: ${err?.message}`);
    }

    // ── Step 6: Create Wema Bank virtual account (for dues collection) ──
    let bankAccountNumber: string | null = null;
    let bankName = 'Wema Bank';
    try {
      const va = await this.interswitch.createVirtualAccount(fullName, dto.phone, undefined, dto.email);
      bankAccountNumber = va.accountNumber;
      bankName = va.bankName ?? 'Wema Bank';
      await this.prisma.wallet.create({
        data: {
          memberId: member.id,
          interswitchRef: va.accountNumber,
          balance: 0,
        },
      });
      this.logger.log(`Wema Bank VA created: ${bankAccountNumber} for member ${member.id}`);
    } catch (err) {
      this.logger.warn(`Virtual account creation failed: ${err?.message}`);
    }

    // ── Step 7: Send onboarding SMS with the Wema Bank account number ──
    const paymentDetails = bankAccountNumber
      ? `Pay your monthly dues into: ${bankName} - ${bankAccountNumber}`
      : null;

    await this.termii.sendOnboarding(
      dto.phone,
      fullName,
      association.plan,
      paymentDetails ?? undefined,
    );

    return {
      memberId: member.id,
      name: fullName,
      phone: member.phone,
      status: member.status,
      // Interswitch merchant wallet
      walletId: walletId ?? null,
      walletAccountNumber: walletAccountNumber ?? null,
      // Wema Bank virtual account (for dues payment)
      bankAccount: {
        accountNumber: bankAccountNumber,
        bankName,
      },
      message: 'Member enrolled. Onboarding SMS sent with payment account details.',
    };
  }

  async getMemberCoverage(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        association: { select: { name: true, plan: true, poolBalance: true, monthlyDues: true, coverageLimit: true } },
        wallet: { select: { interswitchRef: true, balance: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const planLimits: Record<string, number> = { BRONZE: 100000, SILVER: 250000, GOLD: 500000 };
    const limit = member.association.coverageLimit ?? planLimits[member.association.plan] ?? 100000;

    return {
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      status: member.status,
      plan: member.association.plan,
      association: member.association.name,
      monthlyDues: member.association.monthlyDues ?? null,
      // Wallet info
      walletId: member.walletId ?? null,
      walletAccountNumber: member.walletAccountNumber ?? null,
      bankAccount: member.wallet
        ? { accountNumber: member.wallet.interswitchRef, balance: member.wallet.balance }
        : null,
      // Coverage
      coverageLimit: limit,
      coverageUsed: member.coverageUsedThisYear,
      coverageRemaining: Math.max(0, limit - member.coverageUsedThisYear),
      enrolledAt: member.enrolledAt,
    };
  }
}
