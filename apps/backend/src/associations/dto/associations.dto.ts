import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Association creation ─────────────────────────────────────────────────────

export class CreateAssociationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  cacNumber?: string;

  @IsString()
  @IsOptional()
  @IsIn(['BRONZE', 'SILVER', 'GOLD'])
  plan?: 'BRONZE' | 'SILVER' | 'GOLD';

  @IsNumber()
  @IsOptional()
  monthlyDues?: number;

  @IsNumber()
  @IsOptional()
  coverageLimit?: number;
}

// ─── Payment verification ─────────────────────────────────────────────────────

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionReference: string;

  @IsNotEmpty()
  amountKobo: number;
}

// ─── Member enrollment (single + bulk — same endpoint) ───────────────────────

export class EnrollMemberItemDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  bvn: string;
}

export class EnrollMembersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnrollMemberItemDto)
  members: EnrollMemberItemDto[];
}

// ─── Pagination & filter query params ────────────────────────────────────────

export class PaginationQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string; // coerced to number in service

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class MembersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'PAUSED', 'FLAGGED', 'INCOMPLETE', ''])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string; // name or phone partial match
}

export class ClaimsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'PAID', 'REJECTED', 'FAILED', ''])
  status?: string;
}

export class TransactionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['DIRECT_DEBIT', 'CASH', ''])
  source?: string;

  @IsOptional()
  @IsString()
  week?: string; // ISO date string for week filter
}
