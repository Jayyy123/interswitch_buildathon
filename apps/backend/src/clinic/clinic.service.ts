import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { InterswitchService } from '../interswitch/interswitch.service';
import { RegisterClinicDto, SaveClinicSetupDto } from './dto/clinic.dto';
import {
  ClinicWalletProvisionJobData,
  PAYOUT_QUEUE,
  PayoutJobName,
} from '../payouts/payout.queue';

@Injectable()
export class ClinicService {
  private readonly logger = new Logger(ClinicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interswitch: InterswitchService,
    @InjectQueue(PAYOUT_QUEUE) private readonly payoutQueue: Queue,
  ) {}

  // ─── Public helper (used by ClaimsService) ───────────────────────────────────

  async getClinicAdmin(userId: string) {
    const admin = await this.prisma.clinicAdmin.findUnique({
      where: { userId },
      include: { clinic: true },
    });
    if (!admin) {
      throw new BadRequestException(
        'Clinic profile not found. Please complete registration first.',
      );
    }
    return admin;
  }

  // ─── Registration ────────────────────────────────────────────────────────────

  async registerClinic(dto: RegisterClinicDto, userId: string) {
    const existing = await this.prisma.clinicAdmin.findUnique({
      where: { userId },
    });
    if (existing)
      throw new ConflictException(
        'This account is already linked to a clinic.',
      );

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Create clinic immediately — walletId is null until async job runs
    const clinic = await this.prisma.clinic.create({
      data: {
        name: dto.name,
        address: dto.address,
        walletId: null,
        walletAccountNumber: null,
        walletBankName: null,
        admins: { create: { userId } },
      },
      include: { admins: true },
    });

    // Enqueue async wallet provisioning — BullMQ handles retries
    await this.payoutQueue.add(
      PayoutJobName.PROVISION_CLINIC_WALLET,
      {
        clinicId: clinic.id,
        clinicName: clinic.name,
        adminPhone: user.phone,
        adminUserId: userId,
      } satisfies ClinicWalletProvisionJobData,
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    this.logger.log(
      `Clinic "${clinic.name}" created. Wallet provisioning queued.`,
    );

    return {
      clinicId: clinic.id,
      clinicName: clinic.name,
      adminId: clinic.admins[0].id,
    };
  }

  // ─── Setup ───────────────────────────────────────────────────────────────────

  async getSetup(userId: string) {
    const admin = await this.prisma.clinicAdmin.findUnique({
      where: { userId },
      include: { clinic: true },
    });
    return admin?.clinic ?? null;
  }

  async saveSetup(dto: SaveClinicSetupDto, userId: string) {
    const admin = await this.getClinicAdmin(userId);
    return this.prisma.clinic.update({
      where: { id: admin.clinicId },
      data: {
        name: dto.name,
        address: dto.address,
      },
    });
  }

  // ─── Wallet info ─────────────────────────────────────────────────────────────

  async getWalletInfo(userId: string) {
    const admin = await this.getClinicAdmin(userId);
    const clinic = admin.clinic;

    if (!clinic.walletId) {
      return {
        walletId: null,
        accountNumber: null,
        bankName: null,
        balanceNaira: null,
        status: 'PROVISIONING', // async job still running
      };
    }

    try {
      const balance = await this.interswitch.getMemberWalletBalance(
        clinic.walletId,
      );
      return {
        walletId: clinic.walletId,
        accountNumber: clinic.walletAccountNumber,
        bankName: clinic.walletBankName ?? 'Wema Bank',
        balanceNaira: Math.round(balance.availableBalance / 100), // kobo → naira
        status: 'ACTIVE',
      };
    } catch {
      return {
        walletId: clinic.walletId,
        accountNumber: clinic.walletAccountNumber,
        bankName: clinic.walletBankName ?? 'Wema Bank',
        balanceNaira: null,
        status: 'ACTIVE',
      };
    }
  }
}
