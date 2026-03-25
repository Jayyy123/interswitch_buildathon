import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class InitiatePaymentDto {
  @IsNumber()
  @Min(1)
  amount: number; // in Naira (we convert to kobo internally)

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl()
  redirectUrl: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
