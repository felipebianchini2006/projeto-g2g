import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmReceiptDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note?: string;
}
