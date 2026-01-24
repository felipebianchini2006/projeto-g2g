import { IsString, IsUUID } from 'class-validator';

export class PayOrderWithWalletDto {
  @IsString()
  @IsUUID()
  orderId!: string;
}
