import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ADMIN_PERMISSION_KEY } from '../decorators/admin-permission.decorator';
import type { JwtPayload } from '../auth.types';

type AuthenticatedRequest = Request & {
  user?: JwtPayload;
};

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const permission = this.reflector.getAllAndOverride<string>(ADMIN_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Missing user context.');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    if (user.role !== UserRole.AJUDANTE) {
      throw new ForbiddenException('Insufficient role.');
    }

    const result = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { adminPermissions: true },
    });
    const permissions = result?.adminPermissions ?? [];

    if (!permissions.includes(permission)) {
      throw new ForbiddenException('Missing admin permission.');
    }

    return true;
  }
}
