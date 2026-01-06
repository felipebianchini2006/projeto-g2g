import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TicketMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
