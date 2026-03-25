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
  email?: string;
}
