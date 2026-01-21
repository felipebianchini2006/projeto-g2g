import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { InventoryStatus } from '@prisma/client';

export class InventoryUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus;
}
