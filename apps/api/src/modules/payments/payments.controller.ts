import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';
import { PaymentsService } from './payments.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('pix/create')
  async createPix(@Req() req: AuthenticatedRequest, @Body() dto: CreatePixPaymentDto) {
    const userId = this.getUserId(req);
    return this.paymentsService.createPixChargeForOrder(dto.orderId, userId);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
