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
    return this.prisma.claim.update({
      where: { id: claimId },
      data: { status },
    });
  }

  // ─── Submit Claim ─────────────────────────────────────────────────────────

  async submitClaim(dto: SubmitClaimDto, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId, associationId: dto.associationId },
    });
    if (!member)
      throw new NotFoundException('Member not found in this association');

    return this.prisma.claim.create({
      data: {
        associationId: dto.associationId,
        memberId: member.id,
        hospitalName: dto.hospitalName,
        hospitalAccount: dto.hospitalAccount,
        hospitalBankCode: dto.hospitalBankCode,
        billAmount: dto.billAmount,
        billPhotoUrl: dto.billPhotoUrl,
        description: dto.description,
        status: ClaimStatus.PENDING,
      },
    });
  }

  // ─── Approve Claim + Payout ───────────────────────────────────────────────

  async approveClaim(
    claimId: string,
    dto: ApproveClaimDto,
    iyalojaUserId: string,
  ) {
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
        const iyaloja = await this.prisma.user.findUnique({
          where: { id: iyalojaUserId },
        });
        if (iyaloja) await this.interswitch.sendSafeToken(iyaloja.phone);
        throw new BadRequestException(
          'OTP required for claims over ₦50,000. Check your SMS and resubmit with safeTokenOtp.',
        );
      }
      const iyaloja = await this.prisma.user.findUnique({
        where: { id: iyalojaUserId },
      });
      const valid = await this.interswitch.verifySafeToken(
        iyaloja!.phone,
        dto.safeTokenOtp,
      );
      if (!valid)
        throw new BadRequestException('Invalid or expired SafeToken OTP');
    }

    // Check pool balance
    const association = await this.prisma.association.findUnique({
      where: { id: claim.associationId },
    });
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

    // Payout to hospital via merchant wallet.
    // NOTE: transferFundsViaSva() is also implemented (correct MAC confirmed) but SVA creds
    // lack TransferFunds scope in QA — contact Interswitch to enable it on the credentials.
    // Wallet payout requires INTERSWITCH_WALLET_PIN env var.
    let interswitchRef: string | null = null;
    if (claim.hospitalAccount && claim.hospitalBankCode) {
      try {
        const payout = await this.interswitch.payoutToHospital(
          claimId,
          approvedAmount,
          claim.member.name ?? 'Member',
          claim.hospitalName,
          claim.hospitalAccount,
          claim.hospitalBankCode,
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
          const planLimits: Record<string, number> = {
            BRONZE: 75_000,
            SILVER: 150_000,
            GOLD: 300_000,
          };
          const coverageLimit =
            claim.association.coverageLimit ??
            planLimits[claim.association.plan] ??
            75_000;
          const remaining = Math.max(
            0,
            coverageLimit -
              (claim.member.coverageUsedThisYear + approvedAmount),
          );
          await this.termii.sendClaimPaidSms(
            claim.member.phone,
            approvedAmount,
            claim.hospitalName,
            new Date().toLocaleDateString('en-GB'),
            remaining,
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

    return {
      claimId,
      status: interswitchRef ? 'PAID' : 'APPROVED',
      interswitchRef,
    };
  }

  // ─── Wallet & Banks ───────────────────────────────────────────────────────

  /**
   * Returns the iyaloja's association pool balance from DB,
   * plus a list of member wallets. (api-gateway is IP-restricted in QA;
   * the DB poolBalance is the authoritative source updated on each verified payment.)
   */
  async getWalletBalance(userId: string) {
    const association = await this.prisma.association.findFirst({
      where: { userId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            phone: true,
            walletId: true,
            walletAccountNumber: true,
            wallet: { select: { interswitchRef: true, balance: true } },
          },
        },
      },
    });

    if (!association) {
      return {
        poolBalance: 0,
        poolWalletId: null,
        poolAccountNumber: null,
        memberCount: 0,
        members: [],
      };
    }

    return {
      associationId: association.id,
      associationName: association.name,
      plan: association.plan,
      // Pool wallet
      poolBalance: association.poolBalance,
      poolWalletId: association.walletId,
      poolAccountNumber: association.walletAccountNumber,
      // Members and their wallets
      memberCount: association.members.length,
      members: association.members.map((m) => ({
        memberId: m.id,
        name: m.name,
        phone: m.phone,
        walletId: m.walletId,
        walletAccountNumber: m.walletAccountNumber,
        bankAccount: m.wallet
          ? {
              accountNumber: m.wallet.interswitchRef,
              balance: m.wallet.balance,
            }
          : null,
      })),
    };
  }

  getBankCodes() {
    return this.interswitch.getBankCodes();
  }
}
