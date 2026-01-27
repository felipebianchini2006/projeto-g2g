import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import type { JwtPayload } from '../auth.types';
import { PrismaService } from '../../prisma/prisma.service';

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid token payload.');
      }
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, blockedAt: true, blockedUntil: true, blockedReason: true },
      });
      if (!user) {
        throw new UnauthorizedException('User not found.');
      }
      if (user.blockedAt && (!user.blockedUntil || user.blockedUntil > new Date())) {
        const reason = user.blockedReason?.trim();
        throw new ForbiddenException(
          reason ? `Usuário Bloqueado: ${reason}` : 'Usuário Bloqueado.',
        );
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
