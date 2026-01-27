import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PartnerPayoutStatus, UserRole } from '@prisma/client';

import { PartnersService } from './partners.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PartnersService', () => {
  let service: PartnersService;
  const mockPrisma = {
    partner: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    partnerClick: {
      count: jest.fn(),
    },
    orderAttribution: {
      count: jest.fn(),
    },
    partnerCommissionEvent: {
      aggregate: jest.fn(),
    },
    partnerPayout: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deletePartner', () => {
    it('soft deletes a partner', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.partner.update.mockResolvedValue({ id: '1', active: false });

      await service.deletePartner('1');

      expect(mockPrisma.partner.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { active: false },
      });
    });
  });

  describe('getPartnerStatsForUser', () => {
    it('returns stats and balance for owner', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        ownerUserId: 'user-1',
        ownerEmail: null,
        coupons: [{ id: 'coupon-1' }],
      });
      mockPrisma.partnerClick.count.mockResolvedValue(5);
      mockPrisma.orderAttribution.count.mockResolvedValue(2);
      mockPrisma.partnerCommissionEvent.aggregate
        .mockResolvedValueOnce({ _sum: { amountCents: 1000 } })
        .mockResolvedValueOnce({ _sum: { amountCents: -200 } });
      mockPrisma.partnerPayout.aggregate.mockResolvedValue({ _sum: { amountCents: 300 } });

      const result = await service.getPartnerStatsForUser(
        'partner-1',
        'user-1',
        UserRole.USER,
      );

      expect(result).toEqual(
        expect.objectContaining({
          partnerId: 'partner-1',
          clicks: 5,
          orders: 2,
          earnedCents: 1000,
          reversedCents: 200,
          paidCents: 300,
          commissionCents: 800,
          balanceCents: 500,
        }),
      );
      expect(result.coupons).toHaveLength(1);
    });

    it('rejects non-owner access', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        ownerUserId: 'user-2',
        ownerEmail: null,
        coupons: [],
      });

      await expect(
        service.getPartnerStatsForUser('partner-1', 'user-1', UserRole.USER),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows access when owner email matches user email', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        ownerUserId: null,
        ownerEmail: 'admin@email.com',
        coupons: [],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'admin@email.com' });
      mockPrisma.partnerClick.count.mockResolvedValue(0);
      mockPrisma.orderAttribution.count.mockResolvedValue(0);
      mockPrisma.partnerCommissionEvent.aggregate
        .mockResolvedValueOnce({ _sum: { amountCents: 0 } })
        .mockResolvedValueOnce({ _sum: { amountCents: 0 } });
      mockPrisma.partnerPayout.aggregate.mockResolvedValue({ _sum: { amountCents: 0 } });

      const result = await service.getPartnerStatsForUser(
        'partner-1',
        'user-1',
        UserRole.USER,
      );

      expect(result).toEqual(
        expect.objectContaining({
          partnerId: 'partner-1',
          balanceCents: 0,
        }),
      );
    });
  });

  describe('requestPartnerPayout', () => {
    it('prevents payout above balance', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: 'partner-1', ownerUserId: 'user-1' });
      mockPrisma.partnerCommissionEvent.aggregate
        .mockResolvedValueOnce({ _sum: { amountCents: 500 } })
        .mockResolvedValueOnce({ _sum: { amountCents: 0 } });
      mockPrisma.partnerPayout.aggregate.mockResolvedValue({ _sum: { amountCents: 100 } });

      await expect(
        service.requestPartnerPayout(
          'partner-1',
          'user-1',
          UserRole.USER,
          { amountCents: 500, pixKey: 'pix', pixKeyType: 'CPF' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates payout when balance is sufficient', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: 'partner-1', ownerUserId: 'user-1' });
      mockPrisma.partnerCommissionEvent.aggregate
        .mockResolvedValueOnce({ _sum: { amountCents: 800 } })
        .mockResolvedValueOnce({ _sum: { amountCents: 0 } });
      mockPrisma.partnerPayout.aggregate.mockResolvedValue({ _sum: { amountCents: 100 } });
      mockPrisma.partnerPayout.create.mockResolvedValue({ id: 'payout-1' });

      const result = await service.requestPartnerPayout(
        'partner-1',
        'user-1',
        UserRole.USER,
        { amountCents: 300, pixKey: 'pix', pixKeyType: 'CPF' },
      );

      expect(result).toEqual({ id: 'payout-1' });
      expect(mockPrisma.partnerPayout.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: 'partner-1',
          requestedByUserId: 'user-1',
          amountCents: 300,
          status: PartnerPayoutStatus.PENDING,
        }),
      });
    });

    it('rejects payout for non-owner', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue({ id: 'partner-1', ownerUserId: 'user-2' });

      await expect(
        service.requestPartnerPayout(
          'partner-1',
          'user-1',
          UserRole.USER,
          { amountCents: 100, pixKey: 'pix', pixKeyType: 'CPF' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns not found when partner missing', async () => {
      mockPrisma.partner.findUnique.mockResolvedValue(null);

      await expect(
        service.requestPartnerPayout(
          'partner-1',
          'user-1',
          UserRole.USER,
          { amountCents: 100, pixKey: 'pix', pixKeyType: 'CPF' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
