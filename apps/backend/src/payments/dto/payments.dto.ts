import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SubmitClaimDto {
  @IsString()
  @IsNotEmpty()
  associationId: string;

  @IsString()
  @IsNotEmpty()
  hospitalName: string;

  @IsString()
  @IsOptional()
  hospitalAccount?: string;

  @IsString()
  @IsOptional()
  hospitalBankCode?: string;

  @IsNumber()
  billAmount: number; // NGN

  @IsString()
  @IsOptional()
  billPhotoUrl?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ApproveClaimDto {
  @IsString()
  @IsOptional()
  safeTokenOtp?: string; // Required for claims >= 50,000 NGN
}
