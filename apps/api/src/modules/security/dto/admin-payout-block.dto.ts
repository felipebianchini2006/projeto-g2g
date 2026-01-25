import { IsString, MinLength } from 'class-validator';

export class AdminPayoutBlockDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
