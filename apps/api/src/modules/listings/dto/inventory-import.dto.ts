import { IsString, MaxLength, MinLength } from 'class-validator';

export class InventoryImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  payload!: string;
}
