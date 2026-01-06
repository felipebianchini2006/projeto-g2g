import { DisputeStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class DisputeQueryDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
}
