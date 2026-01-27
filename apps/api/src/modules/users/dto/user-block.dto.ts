import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UserBlockDto {
  @IsString()
  @MinLength(3)
  reason!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}
