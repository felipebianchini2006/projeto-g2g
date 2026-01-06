import { IsString, MinLength } from 'class-validator';

export class UserBlockDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
