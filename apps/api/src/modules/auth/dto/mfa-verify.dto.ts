import { IsString, Length } from 'class-validator';

export class MfaVerifyDto {
  @IsString()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
