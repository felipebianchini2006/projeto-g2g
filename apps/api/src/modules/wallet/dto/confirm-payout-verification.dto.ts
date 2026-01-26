import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmPayoutVerificationDto {
  @IsString()
  payoutDraftId!: string;

  @IsString()
  @MaxLength(10)
  codeEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  codeWhatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  codeSms?: string;
}
