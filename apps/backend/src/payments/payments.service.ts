import { Injectable, NotFoundException } from '@nestjs/common';
import { ClaimStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// TODO: Wire up to InterswitchService once the claims flow is finalized.
// For now this is a scaffold that manages Claim records in the DB.

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserClaims(userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { userId },
    });
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
    if (!claim) {
      throw new NotFoundException(`Claim ${claimId} not found`);
    }
    return claim;
  }

  async updateClaimStatus(claimId: string, status: ClaimStatus) {
    return this.prisma.claim.update({
      where: { id: claimId },
      data: { status },
    });
  }
}
