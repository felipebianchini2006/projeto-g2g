import { IsBoolean, IsOptional } from 'class-validator';

import { CreatePayoutDto } from './create-payout.dto';

export class RequestPayoutVerificationDto extends CreatePayoutDto {
  @IsOptional()
  @IsBoolean()
  useWhatsappFallback?: boolean;
}
