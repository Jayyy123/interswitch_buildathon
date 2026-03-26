import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAssociationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  cacNumber?: string;

  @IsString()
  @IsOptional()
  plan?: 'BRONZE' | 'SILVER' | 'GOLD';

  @IsNumber()
  @IsOptional()
  monthlyDues?: number;

  @IsNumber()
  @IsOptional()
  coverageLimit?: number;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionReference: string;

  @IsNotEmpty()
  amountKobo: number;
}
