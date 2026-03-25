import { Injectable, NotFoundException } from '@nestjs/common';
import { PlanTier } from '@prisma/client';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssociationDto, VerifyPaymentDto } from './dto/associations.dto';

@Injectable()
export class AssociationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
  ) {}

  async createAssociation(dto: CreateAssociationDto, userId: string) {
    return this.prisma.association.create({
      data: {
        userId,
        name: dto.name,
        cacNumber: dto.cacNumber,
        plan: (dto.plan as PlanTier) ?? PlanTier.BRONZE,
        poolBalance: 0,
      },
    });
  }

  async getAssociation(id: string, userId: string) {
    const association = await this.prisma.association.findFirst({
      where: { id, userId },
    });
    if (!association) throw new NotFoundException('Association not found');

    const [members, claims, contributions] = await Promise.all([
      this.prisma.member.findMany({
        where: { associationId: id },
        select: { id: true, name: true, phone: true, status: true, enrolledAt: true },
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
    const association = await this.prisma.association.findFirst({
      where: { id, userId },
    });
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
