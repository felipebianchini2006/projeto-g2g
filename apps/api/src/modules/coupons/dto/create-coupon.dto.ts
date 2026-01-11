import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

const normalizeCode = (value: unknown) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateCouponDto {
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/)
  code!: string;

  @IsOptional()
  @IsUUID()
  partnerId?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  discountBps?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  discountCents?: number | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number | null;
}
