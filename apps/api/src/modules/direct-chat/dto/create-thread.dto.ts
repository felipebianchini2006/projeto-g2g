import { IsString, MaxLength } from 'class-validator';

export class CreateThreadDto {
  @IsString()
  @MaxLength(64)
  targetUserId!: string;
}
