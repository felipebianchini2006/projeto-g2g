import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const normalizeSlug = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreatePartnerDto {
  @IsString()
  name!: string;

  @Transform(({ value }) => normalizeSlug(value))
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  commissionBps?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;
}
