import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import type { JwtPayload } from '../auth/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { ConfirmReceiptDto } from './dto/confirm-receipt.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateDeliveryEvidenceDto } from './dto/create-delivery-evidence.dto';
import { MarkDeliveredDto } from './dto/mark-delivered.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreateSellerReviewDto } from './dto/create-seller-review.dto';
import { ReviewEligibilityQueryDto } from './dto/review-eligibility-query.dto';
import { OrderAccessGuard } from './guards/order-access.guard';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    const userId = this.getUserId(req);
    return this.ordersService.createOrder(userId, dto, this.getRequestMeta(req));
  }

  @Get()
  list(@Req() req: AuthenticatedRequest, @Query() query: OrderQueryDto) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? 'USER';
    return this.ordersService.listOrders(userId, role, query);
  }

  @Get('review-eligibility')
  getReviewEligibility(
    @Req() req: AuthenticatedRequest,
    @Query() query: ReviewEligibilityQueryDto,
  ) {
    const userId = this.getUserId(req);
    return this.ordersService.getReviewEligibility(userId, query.listingId);
  }

  @Get(':id')
  @UseGuards(OrderAccessGuard)
  get(@Param('id') orderId: string) {
    return this.ordersService.getOrder(orderId);
  }

  @Post(':id/cancel')
  @UseGuards(OrderAccessGuard)
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    const userId = this.getUserId(req);
    return this.ordersService.cancelOrder(orderId, userId, dto, this.getRequestMeta(req));
  }

  @Post(':id/confirm-receipt')
  @UseGuards(OrderAccessGuard)
  confirmReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: ConfirmReceiptDto,
  ) {
    const userId = this.getUserId(req);
    return this.ordersService.confirmReceipt(orderId, userId, dto, this.getRequestMeta(req));
  }

  @Post(':id/open-dispute')
  @UseGuards(OrderAccessGuard)
  openDispute(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: OpenDisputeDto,
  ) {
    const userId = this.getUserId(req);
    return this.ordersService.openDispute(orderId, userId, dto, this.getRequestMeta(req));
  }

  @Post(':id/dispute')
  @UseGuards(OrderAccessGuard)
  openDisputeV2(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: OpenDisputeDto,
  ) {
    const userId = this.getUserId(req);
    return this.ordersService.openDispute(orderId, userId, dto, this.getRequestMeta(req));
  }

  @Post(':id/evidence')
  @UseGuards(OrderAccessGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  addEvidence(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: CreateDeliveryEvidenceDto,
  ) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? UserRole.USER;
    return this.ordersService.addDeliveryEvidence(
      orderId,
      userId,
      role,
      dto,
      this.getRequestMeta(req),
    );
  }

  @Post(':id/mark-delivered')
  @UseGuards(OrderAccessGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  markDelivered(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: MarkDeliveredDto,
  ) {
    const userId = this.getUserId(req);
    const role = req.user?.role ?? UserRole.USER;
    return this.ordersService.markOrderDelivered(
      orderId,
      userId,
      role,
      dto,
      this.getRequestMeta(req),
    );
  }

  @Post(':id/review')
  @UseGuards(OrderAccessGuard)
  createReview(
    @Req() req: AuthenticatedRequest,
    @Param('id') orderId: string,
    @Body() dto: CreateSellerReviewDto,
  ) {
    const userId = this.getUserId(req);
    return this.ordersService.createSellerReview(orderId, userId, dto);
  }

  private getUserId(request: AuthenticatedRequest) {
    if (!request.user?.sub) {
      throw new UnauthorizedException('Missing user context.');
    }
    return request.user.sub;
  }

  private getRequestMeta(request: Request) {
    return {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }
}
