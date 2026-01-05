import { IsArray, IsString, ArrayMaxSize, ArrayNotEmpty, MinLength } from 'class-validator';

export class InventoryAddDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  codes!: string[];
}
