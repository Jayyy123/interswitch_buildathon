import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(UserRole)
  role: UserRole;
}
