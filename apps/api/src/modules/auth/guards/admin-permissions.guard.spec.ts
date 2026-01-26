import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { ADMIN_PERMISSION_KEY } from '../decorators/admin-permission.decorator';
import { AdminPermissionsGuard } from './admin-permissions.guard';

const createContext = (handler: () => void, user: { sub: string; role: UserRole }) =>
  ({
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as unknown as ExecutionContext;

describe('AdminPermissionsGuard', () => {
  const reflector = new Reflector();
  const handler = () => {};

  beforeAll(() => {
    Reflect.defineMetadata(ADMIN_PERMISSION_KEY, 'admin.users', handler);
  });

  it('allows admins regardless of permission', async () => {
    const prisma = { user: { findUnique: jest.fn() } };
    const guard = new AdminPermissionsGuard(reflector, prisma as any);
    const context = createContext(handler, { sub: 'admin-1', role: UserRole.ADMIN });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows helper with matching permission', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ adminPermissions: ['admin.users'] }) },
    };
    const guard = new AdminPermissionsGuard(reflector, prisma as any);
    const context = createContext(handler, { sub: 'helper-1', role: UserRole.AJUDANTE });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies helper without permission', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ adminPermissions: ['admin.orders'] }) },
    };
    const guard = new AdminPermissionsGuard(reflector, prisma as any);
    const context = createContext(handler, { sub: 'helper-2', role: UserRole.AJUDANTE });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
