import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { BeneficiaryType, PayoutSpeed, PixKeyType } from '@prisma/client';

export class CreatePayoutDto {
  @IsInt()
  @Min(100)
  amountCents!: number;

  @IsString()
  @MaxLength(140)
  pixKey!: string;

  @IsOptional()
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @IsString()
  @MaxLength(80)
  beneficiaryName!: string;

  @IsOptional()
  @IsEnum(BeneficiaryType)
  beneficiaryType?: BeneficiaryType;

  @IsOptional()
  @IsEnum(PayoutSpeed)
  payoutSpeed?: PayoutSpeed;
}
