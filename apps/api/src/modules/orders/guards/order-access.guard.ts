import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../../auth/auth.types';

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Injectable()
export class OrderAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const orderId = request.params['id'];

    if (!user) {
      throw new UnauthorizedException('Contexto de usuário ausente.');
    }

    if (!orderId) {
      throw new NotFoundException('Order not found.');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { buyerId: true, sellerId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    if (order.buyerId !== user.sub && order.sellerId !== user.sub) {
      throw new ForbiddenException('Order access denied.');
    }

    return true;
  }
}
