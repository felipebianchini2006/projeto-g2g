import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListingStatus, AuditAction } from '@prisma/client';

describe('ListingsService', () => {
    let service: ListingsService;
    let prisma: any;

    const mockPrisma = {
        listing: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        auditLog: {
            create: jest.fn(),
        },
        $transaction: jest.fn(),
        listingFlag: {
            upsert: jest.fn(),
        }
    };

    beforeEach(async () => {
        // Reset mocks
        mockPrisma.listing.findUnique.mockReset();
        mockPrisma.listing.update.mockReset();
        mockPrisma.$transaction.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ListingsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<ListingsService>(ListingsService);
        prisma = module.get(PrismaService);
    });

    describe('approveListing', () => {
        it('sets status to PUBLISHED and creates audit log', async () => {
            const listingId = '1';
            const adminId = 'admin-1';
            const mockListing = { id: listingId, status: ListingStatus.PENDING };
            const mockUpdated = { id: listingId, status: ListingStatus.PUBLISHED };

            mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
            mockPrisma.listing.findUnique.mockResolvedValue(mockListing);
            mockPrisma.listing.update.mockResolvedValue(mockUpdated);
            mockPrisma.auditLog.create.mockResolvedValue({});

            const result = await service.approveListing(listingId, adminId, {});

            expect(result.status).toBe(ListingStatus.PUBLISHED);
            expect(mockPrisma.listing.update).toHaveBeenCalledWith({
                where: { id: listingId },
                data: { status: ListingStatus.PUBLISHED }
            });
        });

        it('throws if listing not found', async () => {
            mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
            mockPrisma.listing.findUnique.mockResolvedValue(null);

            await expect(service.approveListing('x', 'admin', {})).rejects.toThrow(NotFoundException);
        });
    });
});
