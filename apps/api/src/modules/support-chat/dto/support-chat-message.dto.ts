import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SupportChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}
