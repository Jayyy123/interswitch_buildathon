import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Step 1: Generate and store a hashed OTP for the given phone number.
   * In production this would send the code via Termii.
   * Returns the raw code for now so the client can use it directly (dev only).
   */
  async sendOtp(dto: SendOtpDto): Promise<{ message: string; code?: string }> {
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(rawCode, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any existing unused OTPs for this phone
    await this.prisma.otpCode.updateMany({
      where: { phone: dto.phone, used: false },
      data: { used: true },
    });

    await this.prisma.otpCode.create({
      data: {
        phone: dto.phone,
        code: hashedCode,
        expiresAt,
      },
    });

    // TODO: send rawCode via Termii SMS in production
    // await this.termiiService.sendSms(dto.phone, `Your OmoHealth OTP is: ${rawCode}`);

    return {
      message: 'OTP sent successfully',
      // Remove this in production — only for dev/testing
      ...(process.env.NODE_ENV !== 'production' && { code: rawCode }),
    };
  }

  /**
   * Step 2: Verify the OTP and issue a JWT.
   * Creates a User row if this is a first-time login.
   */
  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone: dto.phone,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const codeMatch = await bcrypt.compare(dto.code, otpRecord.code);
    if (!codeMatch) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    // Find or create the User
    let user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          role: dto.role,
        },
      });
    }

    if (user.role !== dto.role) {
      throw new BadRequestException(
        `This phone is registered as ${user.role}, not ${dto.role}`,
      );
    }

    const token = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });
    return {
      accessToken: token,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}
