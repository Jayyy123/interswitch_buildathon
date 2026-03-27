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
import { toE164 } from '../common/phone.util';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly termiiService: TermiiService,
  ) { }

  /**
   * Step 1: Generate OTP, store hashed, send via Termii SMS.
   * Phone normalised to E.164 before any DB write.
   */
  async sendOtp(dto: SendOtpDto): Promise<{ message: string; code?: string }> {
    const phone = toE164(dto.phone);
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.otpCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    await this.prisma.otpCode.create({
      data: { phone, code: hashedCode, expiresAt },
    });

    await this.termiiService.sendOtp(phone, rawCode);

    return {
      message: 'OTP sent successfully',
      ...({ code: rawCode }),
    };
  }

  /**
   * Step 2: Verify OTP → issue JWT.
   * Creates User row on first login (phone stored as E.164).
   * For CLINIC_ADMIN: returns clinicId if user already registered a clinic.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const phone = toE164(dto.phone);

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: { phone, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) throw new UnauthorizedException('Invalid or expired OTP');

    const codeMatch = await bcrypt.compare(dto.code, otpRecord.code);
    if (!codeMatch) throw new UnauthorizedException('Invalid or expired OTP');

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, role: dto.role },
      });
    }

    if (user.role !== dto.role) {
      throw new BadRequestException(
        `This phone is registered as ${user.role}, not ${dto.role}`,
      );
    }

    // Look up clinic membership (if CLINIC_ADMIN)
    const [association, clinicAdmin] = await Promise.all([
      this.prisma.association.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }),
      this.prisma.clinicAdmin.findUnique({
        where: { userId: user.id },
        select: { id: true, clinicId: true },
      }),
    ]);

    const token = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });
    return {
      accessToken: token,
      user: { id: user.id, phone: user.phone, role: user.role },
      isNewUser,
      hasAssociation: !!association,
      hasClinic: !!clinicAdmin,
      clinicId: clinicAdmin?.clinicId ?? null, // UI uses this for /clinic/[clinicId] routing
    };
  }
}
