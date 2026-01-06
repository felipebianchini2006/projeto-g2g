import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  platformFeeBps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  orderPaymentTtlSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  settlementReleaseDelayHours?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  splitEnabled?: boolean;
}
