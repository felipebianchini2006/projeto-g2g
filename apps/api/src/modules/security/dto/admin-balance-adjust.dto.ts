import { IsInt, IsString, MinLength, NotEquals } from 'class-validator';

export class AdminBalanceAdjustDto {
  @IsInt()
  @NotEquals(0)
  amountCents!: number;

  @IsString()
  @MinLength(3)
  reason!: string;
}
