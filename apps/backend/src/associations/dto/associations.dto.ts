import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionReference: string;

  @IsNotEmpty()
  amountKobo: number;
}
