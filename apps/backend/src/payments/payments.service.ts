import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClaimStatus } from '@prisma/client';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import { ApproveClaimDto, SubmitClaimDto } from './dto/payments.dto';

const SAFE_TOKEN_THRESHOLD = 50_000; // NGN

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {}

  // ─── Existing ────────────────────────────────────────────────────────────────

  async getUserClaims(userId: string) {
    const member = await this.prisma.member.findFirst({ where: { userId } });
    if (!member) return [];
    return this.prisma.claim.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClaimById(claimId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: { member: true, association: true },
    });
    if (!claim) throw new NotFoundException(`Claim ${claimId} not found`);
    return claim;
  }

  async updateClaimStatus(claimId: string, status: ClaimStatus) {
    return this.prisma.claim.update({ where: { id: claimId }, data: { status } });
  }

  // ─── Submit Claim ─────────────────────────────────────────────────────────

  async submitClaim(dto: SubmitClaimDto, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId, associationId: dto.associationId },
    });
    if (!member) throw new NotFoundException('Member not found in this association');

    return this.prisma.claim.create({
      data: {
        associationId: dto.associationId,
        memberId: member.id,
        hospitalName: dto.hospitalName,
        hospitalAccount: dto.hospitalAccount,
        billAmount: dto.billAmount,
        billPhotoUrl: dto.billPhotoUrl,
        description: dto.description,
        status: ClaimStatus.PENDING,
      },
    });
  }

  // ─── Approve Claim + Payout ───────────────────────────────────────────────

  async approveClaim(claimId: string, dto: ApproveClaimDto, iyalojaUserId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        member: true,
        association: true,
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.association.userId !== iyalojaUserId) {
      throw new BadRequestException('Not your association');
    }
    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException(`Claim is already ${claim.status}`);
    }

    const approvedAmount = claim.billAmount;

    // SafeToken verification for claims >= ₦50,000
    if (approvedAmount >= SAFE_TOKEN_THRESHOLD) {
      if (!dto.safeTokenOtp) {
        // Send the SafeToken OTP to the Iyaloja and ask them to retry with it
        const iyaloja = await this.prisma.user.findUnique({ where: { id: iyalojaUserId } });
        if (iyaloja) await this.interswitch.sendSafeToken(iyaloja.phone);
        throw new BadRequestException('OTP required for claims over ₦50,000. Check your SMS and resubmit with safeTokenOtp.');
      }
      const iyaloja = await this.prisma.user.findUnique({ where: { id: iyalojaUserId } });
      const valid = await this.interswitch.verifySafeToken(iyaloja!.phone, dto.safeTokenOtp);
      if (!valid) throw new BadRequestException('Invalid or expired SafeToken OTP');
    }

    // Check pool balance
    const association = await this.prisma.association.findUnique({ where: { id: claim.associationId } });
    if ((association?.poolBalance ?? 0) < approvedAmount) {
      throw new BadRequestException(
        `Insufficient pool balance. Pool: ₦${association?.poolBalance?.toLocaleString()}, needed: ₦${approvedAmount.toLocaleString()}`,
      );
    }

    // Update claim to APPROVED
    await this.prisma.claim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.APPROVED, approvedAmount },
    });

    // Payout to hospital if account details are provided
    let interswitchRef: string | null = null;
    if (claim.hospitalAccount) {
      try {
        const payout = await this.interswitch.payoutToHospital(
          claimId,
          approvedAmount,
          claim.member.name ?? 'Member',
          claim.hospitalName,
          claim.hospitalAccount,
          '011', // Default GTB — would come from hospital registration in production
        );
        interswitchRef = payout.transactionReference;

        // Deduct from pool
        await this.prisma.association.update({
          where: { id: claim.associationId },
          data: { poolBalance: { decrement: approvedAmount } },
        });
        // Track coverage used
        await this.prisma.member.update({
          where: { id: claim.memberId },
          data: { coverageUsedThisYear: { increment: approvedAmount } },
        });
        // Mark claim PAID
        await this.prisma.claim.update({
          where: { id: claimId },
          data: { status: ClaimStatus.PAID, interswitchRef },
        });

        // Notify member
        if (claim.member.phone) {
          await this.termii.sendClaimConfirmed(
            claim.member.phone,
            claim.member.name ?? 'Member',
            approvedAmount,
            claim.hospitalName,
          );
        }
      } catch (err) {
        // Payout failed — mark claim as FAILED
        await this.prisma.claim.update({
          where: { id: claimId },
          data: { status: ClaimStatus.FAILED },
        });
        throw err;
      }
    }

    return { claimId, status: interswitchRef ? 'PAID' : 'APPROVED', interswitchRef };
  }

  // ─── Wallet & Banks ───────────────────────────────────────────────────────

  async getWalletBalance() {
    return this.interswitch.getWalletBalance();
  }

  async getBankCodes() {
    return this.interswitch.getBankCodes();
  }
}
