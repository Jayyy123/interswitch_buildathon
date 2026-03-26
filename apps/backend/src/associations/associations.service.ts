import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlanTier } from '@prisma/client';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import { CreateAssociationDto, VerifyPaymentDto } from './dto/associations.dto';

@Injectable()
export class AssociationsService {
  private readonly logger = new Logger(AssociationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {}

  /**
   * Creates a new association for an Iyaloja.
   * Also auto-creates:
   *   1. Pool wallet (Association.walletId + walletAccountNumber) — the shared health fund
   *   2. Iyaloja's personal member wallet (Member.walletId + walletAccountNumber)
   *      stored on the Iyaloja's own Member record, if they are also enrolled as a member.
   */
  async createAssociation(dto: CreateAssociationDto, userId: string) {
    // Get the user's phone for wallet creation
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    // Create the association first
    const association = await this.prisma.association.create({
      data: {
        userId,
        name: dto.name,
        cacNumber: dto.cacNumber,
        plan: (dto.plan as PlanTier) ?? PlanTier.BRONZE,
        monthlyDues: dto.monthlyDues,
        coverageLimit: dto.coverageLimit,
        poolBalance: 0,
      },
    });

    // Auto-create pool wallet (fire-and-forget — failure must not block association creation)
    try {
      const poolWallet = await this.interswitch.createMemberWallet(
        `${dto.name}-Pool`,
        user?.phone ?? `+234${association.id.slice(0, 10)}`,
        `pool-${association.id}@omohealth.ng`,
      );
      await this.prisma.association.update({
        where: { id: association.id },
        data: {
          walletId: poolWallet.walletId,
          walletAccountNumber: poolWallet.settlementAccountNumber,
        },
      });
      this.logger.log(`Pool wallet created for association ${association.id}: ${poolWallet.walletId}`);
    } catch (err) {
      this.logger.warn(`Pool wallet creation failed for ${association.id}: ${err?.message}`);
    }

    // If iyaloja is also enrolled as a member in their own association, create their personal wallet
    if (user?.phone) {
      try {
        const existingMember = await this.prisma.member.findFirst({
          where: { associationId: association.id, phone: user.phone },
        });
        if (existingMember && !existingMember.walletId) {
          const personalWallet = await this.interswitch.createMemberWallet(
            user.phone,
            user.phone,
            `member-${existingMember.id}@omohealth.ng`,
          );
          await this.prisma.member.update({
            where: { id: existingMember.id },
            data: {
              walletId: personalWallet.walletId,
              walletAccountNumber: personalWallet.settlementAccountNumber,
            },
          });
        }
      } catch (err) {
        this.logger.warn(`Iyaloja member wallet creation failed: ${err?.message}`);
      }
    }

    return this.prisma.association.findUnique({ where: { id: association.id } });
  }

  async getAssociation(id: string, userId: string) {
    const association = await this.prisma.association.findFirst({
      where: { id, userId },
    });
    if (!association) throw new NotFoundException('Association not found');

    const [members, claims, contributions] = await Promise.all([
      this.prisma.member.findMany({
        where: { associationId: id },
        select: {
          id: true, name: true, phone: true, status: true, enrolledAt: true,
          walletId: true, walletAccountNumber: true,
        },
        orderBy: { enrolledAt: 'desc' },
        take: 50,
      }),
      this.prisma.claim.findMany({
        where: { associationId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.contribution.aggregate({
        where: { associationId: id, status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...association,
      memberCount: members.length,
      members,
      recentClaims: claims,
      totalContributed: contributions._sum.amount ?? 0,
    };
  }

  async verifyAndCreditPool(id: string, dto: VerifyPaymentDto, userId: string) {
    const association = await this.prisma.association.findFirst({ where: { id, userId } });
    if (!association) throw new NotFoundException('Association not found');

    const result = await this.interswitch.verifyPayment(dto.transactionReference, dto.amountKobo);
    if (!result.success) {
      return { success: false, message: `Payment verification failed (code: ${result.responseCode})` };
    }

    const amountNaira = dto.amountKobo / 100;
    await this.prisma.association.update({
      where: { id },
      data: { poolBalance: { increment: amountNaira } },
    });

    return { success: true, credited: amountNaira, newBalance: association.poolBalance + amountNaira };
  }
}
