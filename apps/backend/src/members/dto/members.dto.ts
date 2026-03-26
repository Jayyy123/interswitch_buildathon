import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnrollMemberDto {
  @IsString()
  @IsNotEmpty()
  associationId: string;

  @IsString()
  @IsNotEmpty()
  bvn: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  name?: string; // Iyaloja-provided name — used when BVN lookup doesn't return one

  @IsString()
  @IsOptional()
  email?: string;
}
