import { Body, Controller, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    const userId = this.getUserId(req);
    const order = await this.ordersService.createOrder(userId, dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    const payment = await this.paymentsService.createPixCharge(order, userId);
    return { order, payment };
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }
}
