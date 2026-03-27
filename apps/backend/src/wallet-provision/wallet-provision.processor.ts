import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { InterswitchService } from '../interswitch/interswitch.service';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import {
  PROVISION_MEMBER_WALLET,
  PROVISION_POOL_WALLET,
  WALLET_PROVISION_QUEUE,
} from './wallet-provision.queue';

const PLAN_WEEKLY_AMOUNTS: Record<string, number> = {
  BRONZE: 200,
  SILVER: 400,
  GOLD: 700,
};

@Processor(WALLET_PROVISION_QUEUE)
export class WalletProvisionProcessor extends WorkerHost {
  private readonly logger = new Logger(WalletProvisionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    private readonly termii: TermiiService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === PROVISION_POOL_WALLET) {
      return this.provisionPoolWallet(job.data);
    }
    if (job.name === PROVISION_MEMBER_WALLET) {
      return this.provisionMemberWallet(job.data);
    }
    this.logger.warn(`Unknown wallet job: ${job.name}`);
  }

  // ─── Pool wallet (association) ─────────────────────────────────────────────

  private async provisionPoolWallet(data: {
    associationId: string;
    name: string;
    phone: string;
    email: string;
  }): Promise<void> {
    const { associationId, name, phone, email } = data;
    this.logger.log(
      `Provisioning pool wallet for association ${associationId}`,
    );

    const wallet = await this.interswitch.createMemberWallet(
      name,
      phone,
      email,
    );

    await this.prisma.association.update({
      where: { id: associationId },
      data: {
        walletId: wallet.walletId,
        walletAccountNumber: wallet.settlementAccountNumber,
      },
    });

    this.logger.log(
      `Pool wallet ready for ${associationId}: walletId=${wallet.walletId} VA=${wallet.settlementAccountNumber}`,
    );
  }

  // ─── Member wallet ─────────────────────────────────────────────────────────

  private async provisionMemberWallet(data: {
    memberId: string;
  }): Promise<void> {
    const { memberId } = data;
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: { association: { select: { plan: true, name: true } } },
    });
    if (!member) {
      this.logger.warn(`Member ${memberId} not found — skipping wallet job`);
      return;
    }
    if (member.walletStatus === 'ACTIVE') {
      this.logger.debug(`Member ${memberId} wallet already active — skipping`);
      return;
    }

    this.logger.log(`Provisioning wallet for member ${memberId}`);

    await this.prisma.member.update({
      where: { id: memberId },
      data: { walletStatus: 'PROVISIONING' },
    });

    const wallet = await this.interswitch.createMemberWallet(
      member.name ?? member.phone,
      member.phone,
      `member-${member.id}@omohealth.ng`,
    );

    // Persist wallet — activate member
    await this.prisma.member.update({
      where: { id: memberId },
      data: {
        walletId: wallet.walletId,
        walletAccountNumber: wallet.settlementAccountNumber,
        walletStatus: 'ACTIVE',
        status: MemberStatus.ACTIVE,
      },
    });

    await this.prisma.wallet.upsert({
      where: { memberId },
      create: {
        memberId,
        interswitchRef: wallet.settlementAccountNumber,
        balance: 0,
      },
      update: { interswitchRef: wallet.settlementAccountNumber },
    });

    const weeklyAmount =
      PLAN_WEEKLY_AMOUNTS[member.association?.plan ?? 'SILVER'] ?? 400;
    await this.termii.sendWalletSetupSms(
      member.phone,
      member.name ?? 'Member',
      wallet.settlementAccountNumber,
      wallet.bankName ?? 'Wema Bank',
      weeklyAmount,
    );

    this.logger.log(
      `Member wallet ready ${memberId}: walletId=${wallet.walletId} VA=${wallet.settlementAccountNumber}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Wallet job ${job.name}/${job.id} failed (attempt ${job.attemptsMade})`,
      err.message,
    );
  }
}
