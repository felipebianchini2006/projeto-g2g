import { IsUrl } from 'class-validator';

export class RegisterEfiWebhookDto {
  @IsUrl()
  webhookUrl!: string;
}
