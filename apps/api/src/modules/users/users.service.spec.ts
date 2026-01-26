import { Test, TestingModule } from '@nestjs/testing';
import { AuditAction, UserRole } from '@prisma/client';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { OrdersQueueService } from '../orders/orders.queue.service';

describe('UsersService', () => {
  let service: UsersService;
  const mockPrisma: any = {
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: {} },
        { provide: OrdersQueueService, useValue: {} },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('logs permission change when updating role to AJUDANTE', async () => {
    const current = {
      id: 'user-1',
      email: 'user@example.com',
      role: UserRole.USER,
      adminPermissions: [],
    };
    const updated = {
      ...current,
      role: UserRole.AJUDANTE,
      adminPermissions: ['admin.users'],
    };

    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn().mockResolvedValue(updated),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(tx));

    await service.updateUser(
      'user-1',
      'admin-1',
      { role: UserRole.AJUDANTE, adminPermissions: ['admin.users'] },
      { ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        adminId: 'admin-1',
        action: AuditAction.PERMISSION_CHANGE,
        entityType: 'User',
        entityId: 'user-1',
        ip: '127.0.0.1',
        userAgent: 'jest',
        payload: {
          fromRole: UserRole.USER,
          toRole: UserRole.AJUDANTE,
          permissions: ['admin.users'],
        },
      },
    });
  });
});
