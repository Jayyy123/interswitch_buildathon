import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

// ─── Bulk Enroll ─────────────────────────────────────────────────────────────

export class BulkEnrollMemberDto {
  @IsString()
  @IsNotEmpty()
  full_name: string; // matches CSV column name from UI template

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  bvn: string;
}

export class BulkEnrollDto {
  @IsString()
  @IsNotEmpty()
  associationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkEnrollMemberDto)
  members: BulkEnrollMemberDto[];
}
