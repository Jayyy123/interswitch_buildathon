import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TermiiService } from '../termii/termii.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly termiiService: TermiiService,
  ) {}

  /**
   * Step 1: Generate OTP, store hashed, send via Termii SMS.
   * Returns the raw code only in non-production (dev convenience).
   */
  async sendOtp(dto: SendOtpDto): Promise<{ message: string; code?: string }> {
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate prior unused OTPs for this phone
    await this.prisma.otpCode.updateMany({
      where: { phone: dto.phone, used: false },
      data: { used: true },
    });

    await this.prisma.otpCode.create({
      data: { phone: dto.phone, code: hashedCode, expiresAt },
    });

    await this.termiiService.sendOtp(dto.phone, rawCode);

    return {
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { code: rawCode }),
    };
  }

  /**
   * Step 2: Verify OTP → issue JWT.
   * Creates User row on first login.
   * Wallet creation for IYALOJA happens at createAssociation (they need an association context).
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: { phone: dto.phone, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new UnauthorizedException('Invalid or expired OTP');

    const codeMatch = await bcrypt.compare(dto.code, otpRecord.code);
    if (!codeMatch) throw new UnauthorizedException('Invalid or expired OTP');

    await this.prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

    // Find or create User — isNewUser tells the UI to redirect to initial setup
    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    const isNewUser = !user;
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone: dto.phone, role: dto.role },
      });
    }

    if (user.role !== dto.role) {
      throw new BadRequestException(`This phone is registered as ${user.role}, not ${dto.role}`);
    }

    // Check if setup is complete so UI knows which screen to show
    const [association, clinicAdmin] = await Promise.all([
      this.prisma.association.findFirst({ where: { userId: user.id }, select: { id: true } }),
      this.prisma.clinicAdmin.findFirst({ where: { userId: user.id }, select: { id: true } }),
    ]);

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, role: user.role });
    return {
      accessToken: token,
      user: { id: user.id, phone: user.phone, role: user.role },
      // UI flags:
      isNewUser,                              // true → redirect to onboarding/setup
      hasAssociation: !!association,          // for IYALOJA: false → show create-association screen
      hasClinic: !!clinicAdmin,              // for CLINIC_ADMIN: false → show create-clinic screen
    };
  }
}
