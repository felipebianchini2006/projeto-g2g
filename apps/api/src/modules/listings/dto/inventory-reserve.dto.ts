import { IsUUID } from 'class-validator';

export class InventoryReserveDto {
  @IsUUID()
  orderItemId!: string;
}
