import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import { EnrollMemberDto } from './dto/members.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {}

  /**
   * Full member enrollment flow:
   * 1. BVN lookup → get member's real name
   * 2. Check for duplicates (BVN per association)
   * 3. Create Member record
   * 4. Create virtual Interswitch account (weekly debit wallet)
   * 5. Send onboarding SMS
   */
  async enrollMember(dto: EnrollMemberDto, iyalojaUserId: string) {
    // Verify the association belongs to this Iyaloja
    const association = await this.prisma.association.findFirst({
      where: { id: dto.associationId, userId: iyalojaUserId },
    });
    if (!association) {
      throw new NotFoundException('Association not found or not yours');
    }

    // Check for duplicate BVN in this association
    const existing = await this.prisma.member.findUnique({
      where: { associationId_bvn: { associationId: dto.associationId, bvn: dto.bvn } },
    });
    if (existing) {
      throw new BadRequestException('This BVN is already enrolled in this association');
    }

    // BVN lookup via Interswitch Marketplace
    let bvnDetails: { firstName: string; lastName: string; phone: string };
    try {
      bvnDetails = await this.interswitch.lookupBvn(dto.bvn);
    } catch {
      // Fallback: use provided phone if BVN lookup fails (sandbox may not return all BVNs)
      bvnDetails = { firstName: 'Member', lastName: '', phone: dto.phone };
    }

    const fullName = [bvnDetails.firstName, bvnDetails.lastName].filter(Boolean).join(' ');

    // Create member
    const member = await this.prisma.member.create({
      data: {
        associationId: dto.associationId,
        bvn: dto.bvn,
        phone: dto.phone,
        name: fullName || null,
        status: MemberStatus.ACTIVE,
        waitingPeriodStart: new Date(),
        enrolledAt: new Date(),
      },
    });

    // Create Interswitch virtual account (fire-and-forget — wallet can be set up later)
    let walletRef: string | null = null;
    try {
      const va = await this.interswitch.createVirtualAccount(fullName || 'Member', dto.phone, dto.email);
      await this.prisma.wallet.create({
        data: {
          memberId: member.id,
          interswitchRef: va.accountNumber,
          balance: 0,
        },
      });
      walletRef = `${va.bankName} — ${va.accountNumber}`;
    } catch {
      // Virtual account creation may fail in sandbox — member is still enrolled
    }

    // Send onboarding SMS
    await this.termii.sendOnboarding(
      dto.phone,
      fullName || 'Member',
      association.plan,
      walletRef ?? undefined,
    );

    return {
      memberId: member.id,
      name: fullName,
      phone: member.phone,
      status: member.status,
      walletRef,
      message: 'Member enrolled successfully. Onboarding SMS sent.',
    };
  }

  async getMemberCoverage(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
        association: { select: { name: true, plan: true, poolBalance: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');

    const coverageLimits: Record<string, number> = {
      BRONZE: 100000,
      SILVER: 250000,
      GOLD: 500000,
    };
    const limit = coverageLimits[member.association.plan] ?? 100000;

    return {
      memberId: member.id,
      name: member.name,
      phone: member.phone,
      status: member.status,
      plan: member.association.plan,
      association: member.association.name,
      coverageUsed: member.coverageUsedThisYear,
      coverageLimit: limit,
      coverageRemaining: Math.max(0, limit - member.coverageUsedThisYear),
      enrolledAt: member.enrolledAt,
    };
  }
}
