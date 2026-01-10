import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MarkDeliveredDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note?: string;
}
