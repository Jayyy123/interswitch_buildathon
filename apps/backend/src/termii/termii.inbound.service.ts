import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from './termii.service';

const PLAN_WEEKLY: Record<string, number> = {
  BRONZE: 200,
  SILVER: 400,
  GOLD:   700,
};

const PLAN_LIMITS: Record<string, number> = {
  BRONZE:  75_000,
  SILVER: 150_000,
  GOLD:   300_000,
};

@Injectable()
export class TermiiInboundService {
  private readonly logger = new Logger(TermiiInboundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly termii: TermiiService,
  ) {}

  /**
   * Main entry point for all incoming SMS from Termii webhook.
   * from: E.164 phone e.g. +2347060942709
   * text: raw message body
   */
  async handle(from: string, text: string): Promise<void> {
    const keyword = text.trim().toUpperCase();
    this.logger.log(`Inbound SMS from ${from.slice(0, 8)}***: "${keyword}"`);

    // Look up member by phone number
    const member = await this.prisma.member.findFirst({
      where: { phone: from },
      include: { association: true },
    });

    if (!member) {
      if (keyword === 'JOIN') {
        await this.termii.sendJoinInfo(from);
        return;
      }
      await this.termii.sendNonMemberReply(from);
      return;
    }

    switch (keyword) {
      case 'STATUS':
      case '1':
        await this.handleStatus(from, member);
        break;
      case 'INFO':
        await this.termii.sendInfoMenu(from, member.name);
        break;
      case '2':
        await this.handleAccountDetails(from, member);
        break;
      case '3':
        await this.handleFundWallet(from, member);
        break;
      case '4':
        await this.handleContributionHistory(from, member);
        break;
      case 'START':
        await this.handleStart(from, member);
        break;
      case 'YES':
        await this.handleYes(from, member);
        break;
      case 'JOIN':
        await this.termii.sendJoinInfo(from);
        break;
      default:
        await this.termii.sendInfoMenu(from, member.name);
        break;
    }
  }

  // ─── Keyword Handlers ─────────────────────────────────────────────────────

  private async handleStatus(phone: string, member: any): Promise<void> {
    const plan = member.association?.plan ?? 'BRONZE';

    const weeksPaid = await this.prisma.contribution.count({
      where: { memberId: member.id, status: 'PAID' },
    });

    const claimsAgg = await this.prisma.claim.aggregate({
      where: { memberId: member.id, status: { in: ['APPROVED', 'PAID'] } },
      _sum: { billAmount: true },
    });
    const coverageUsed = Number(claimsAgg._sum.billAmount ?? 0);
    const coverageLimit = PLAN_LIMITS[plan] ?? 75_000;

    const memberStatus: 'ACTIVE' | 'PAUSED' | 'FLAGGED' =
      member.status === 'ACTIVE' ? 'ACTIVE'
      : member.status === 'FLAGGED' ? 'FLAGGED'
      : 'PAUSED';

    await this.termii.sendStatusReply(
      phone,
      member.name,
      plan,
      memberStatus,
      coverageUsed,
      coverageLimit,
      weeksPaid,
      member.walletAccountNumber ?? undefined,
      member.walletAccountNumber ? 'Wema Bank' : undefined,
    );
  }

  private async handleAccountDetails(phone: string, member: any): Promise<void> {
    const plan = member.association?.plan ?? 'BRONZE';
    const weeklyAmt = PLAN_WEEKLY[plan] ?? 200;
    if (!member.walletAccountNumber) {
      await this.termii.sendRaw(
        phone,
        'OmoHealth: Your wallet is still being set up. Please try again shortly.',
      );
      return;
    }
    await this.termii.sendAccountDetails(
      phone,
      member.name,
      member.walletAccountNumber,
      'Wema Bank',
      weeklyAmt,
    );
  }

  private async handleFundWallet(phone: string, member: any): Promise<void> {
    const plan = member.association?.plan ?? 'BRONZE';
    const weeklyAmt = PLAN_WEEKLY[plan] ?? 200;
    if (!member.walletAccountNumber) {
      await this.termii.sendRaw(
        phone,
        'OmoHealth: Your wallet is still being set up. Please try again shortly.',
      );
      return;
    }
    await this.termii.sendFundWalletInstructions(
      phone,
      member.name,
      member.walletAccountNumber,
      weeklyAmt,
    );
  }

  private async handleContributionHistory(phone: string, member: any): Promise<void> {
    const result = await this.prisma.contribution.aggregate({
      where: { memberId: member.id, status: 'PAID' },
      _count: { id: true },
      _sum: { amount: true },
    });
    await this.termii.sendContributionHistory(
      phone,
      member.name,
      result._count.id ?? 0,
      Number(result._sum.amount ?? 0),
    );
  }

  private async handleStart(phone: string, member: any): Promise<void> {
    if (member.status === 'ACTIVE') {
      await this.termii.sendRaw(
        phone,
        `OmoHealth: ${member.name}, your coverage is already ACTIVE. Reply STATUS to check details.`,
      );
      return;
    }
    if (member.walletStatus !== 'ACTIVE') {
      await this.termii.sendRaw(
        phone,
        `OmoHealth: ${member.name}, please fund your wallet first before reactivating.\nReply 3 for funding instructions.`,
      );
      return;
    }
    await this.prisma.member.update({
      where: { id: member.id },
      data: { status: 'ACTIVE' },
    });
    await this.termii.sendReactivationConfirmed(phone, member.name);
  }

  private async handleYes(phone: string, member: any): Promise<void> {
    // Emergency levy not yet implemented as a DB model — acknowledge and note
    await this.termii.sendRaw(
      phone,
      `OmoHealth: There is no active emergency levy for your association at the moment. Reply INFO for other options.`,
    );
  }
}
