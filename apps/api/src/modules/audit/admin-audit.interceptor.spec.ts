import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditAction, UserRole } from '@prisma/client';
import { lastValueFrom, of } from 'rxjs';

import { AdminAuditInterceptor } from './admin-audit.interceptor';

describe('AdminAuditInterceptor', () => {
  it('logs admin mutations with sanitized payload', async () => {
    const prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };
    const interceptor = new AdminAuditInterceptor(prisma as any);

    const request = {
      method: 'POST',
      originalUrl: '/admin/users/123',
      params: { id: '123' },
      body: { name: 'Alice', password: 'secret', token: 'abc' },
      user: { sub: 'admin-1', role: UserRole.ADMIN },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    const next: CallHandler = {
      handle: () => of({ ok: true }),
    };

    await lastValueFrom(interceptor.intercept(context, next));

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        action: AuditAction.CREATE,
        entityType: 'users',
        entityId: '123',
        ip: '127.0.0.1',
        userAgent: 'jest',
        payload: { name: 'Alice' },
      },
    });
  });
});
