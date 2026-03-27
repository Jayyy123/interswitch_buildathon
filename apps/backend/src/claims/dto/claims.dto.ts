import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LookupMemberDto {
  @IsString()
  phone: string;
}

export class SubmitClaimDto {
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
