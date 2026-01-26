import { PixKeyType } from '@prisma/client';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export class RequestPartnerPayoutDto {
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents!: number;

  @IsString()
  pixKey!: string;

  @IsEnum(PixKeyType)
  pixKeyType!: PixKeyType;
}
