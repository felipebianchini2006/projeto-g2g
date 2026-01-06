import { TicketStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class TicketQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
