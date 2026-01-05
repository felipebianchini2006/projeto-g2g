import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RegisterEfiWebhookDto } from './dto/register-efi-webhook.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks/efi')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('pix')
  async receivePixWebhook(@Body() payload: unknown) {
    return this.webhooksService.registerEfiWebhook(payload);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async registerWebhook(@Body() dto: RegisterEfiWebhookDto) {
    return this.webhooksService.registerEfiWebhookEndpoint(dto.webhookUrl);
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMetrics() {
    return this.webhooksService.getMetrics();
  }
}
