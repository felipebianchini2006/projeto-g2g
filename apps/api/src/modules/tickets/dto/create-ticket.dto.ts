import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
