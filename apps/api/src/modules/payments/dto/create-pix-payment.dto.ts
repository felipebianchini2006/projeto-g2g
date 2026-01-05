import { IsUUID } from 'class-validator';

export class CreatePixPaymentDto {
  @IsUUID()
  orderId!: string;
}
