import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  listingId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/)
  couponCode?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  referralSlug?: string;
}
