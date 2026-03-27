import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterClinicDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;
}

export class LookupMemberDto {
  @IsString()
  phone: string;
}

export class SubmitClinicClaimDto {
  @IsString()
  memberId: string;

  @IsString()
  associationId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  billAmount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  billPhotoUrl?: string;
}

export class SaveClinicSetupDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankCode?: string;
}
