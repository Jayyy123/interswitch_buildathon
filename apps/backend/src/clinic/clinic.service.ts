import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterClinicDto, SaveClinicSetupDto } from './dto/clinic.dto';

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Public helper (used by ClaimsService) ───────────────────────────────────

  /**
   * Resolves the ClinicAdmin + Clinic from a JWT userId.
   * Throws if the user hasn't registered a clinic yet.
   */
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

    const clinic = await this.prisma.clinic.create({
      data: {
        name: dto.name,
        address: dto.address,
        bankAccount: dto.bankAccount,
        bankCode: dto.bankCode,
        admins: { create: { userId } },
      },
      include: { admins: true },
    });

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
        bankAccount: dto.bankAccount,
        bankCode: dto.bankCode,
      },
    });
  }
}
