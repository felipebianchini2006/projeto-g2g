import { DeliveryType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateListingDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  categoryGroupId?: string;

  @IsOptional()
  @IsUUID()
  categorySectionId?: string;

  @IsOptional()
  @IsUUID()
  salesModelId?: string;

  @IsOptional()
  @IsUUID()
  originId?: string;

  @IsOptional()
  @IsUUID()
  recoveryOptionId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceCents!: number;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  deliverySlaHours!: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  refundPolicy!: string;
}
