import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RgVerificationService } from './rg-verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { RgStatus } from '@prisma/client';

describe('RgVerificationService', () => {
    let service: RgVerificationService;

    const mockPrisma = {
        rgVerification: {
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RgVerificationService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<RgVerificationService>(RgVerificationService);
    });

    describe('submitRg', () => {
        const userId = 'user-123';
        const rgNumber = '12.345.678-9';
        const rgPhotoUrl = '/uploads/rg/test.png';

        it('creates RG verification successfully', async () => {
            mockPrisma.rgVerification.findFirst.mockResolvedValue(null);
            mockPrisma.rgVerification.create.mockResolvedValue({
                id: 'rg-123',
                userId,
                rgNumber,
                rgPhotoUrl,
                status: RgStatus.PENDING,
            });

            const result = await service.submitRg(userId, rgNumber, rgPhotoUrl);

            expect(result.id).toBe('rg-123');
            expect(result.status).toBe(RgStatus.PENDING);
            expect(mockPrisma.rgVerification.create).toHaveBeenCalledWith({
                data: {
                    userId,
                    rgNumber,
                    rgPhotoUrl,
                    status: RgStatus.PENDING,
                },
            });
        });

        it('throws BadRequestException when pending verification exists', async () => {
            mockPrisma.rgVerification.findFirst.mockResolvedValue({ id: 'existing' });

            await expect(service.submitRg(userId, rgNumber, rgPhotoUrl))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('getUserCurrentRg', () => {
        it('returns most recent verification', async () => {
            const mockVerification = { id: 'rg-123', status: RgStatus.PENDING };
            mockPrisma.rgVerification.findFirst.mockResolvedValue(mockVerification);

            const result = await service.getUserCurrentRg('user-123');

            expect(result?.id).toBe('rg-123');
            expect(mockPrisma.rgVerification.findFirst).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                orderBy: { submittedAt: 'desc' },
            });
        });

        it('returns null when no verification exists', async () => {
            mockPrisma.rgVerification.findFirst.mockResolvedValue(null);

            const result = await service.getUserCurrentRg('user-123');

            expect(result).toBeNull();
        });
    });

    describe('listRgVerifications', () => {
        it('lists all verifications', async () => {
            const mockList = [{ id: 'rg-1' }, { id: 'rg-2' }];
            mockPrisma.rgVerification.findMany.mockResolvedValue(mockList);

            const result = await service.listRgVerifications({});

            expect(result).toHaveLength(2);
        });

        it('filters by status', async () => {
            mockPrisma.rgVerification.findMany.mockResolvedValue([]);

            await service.listRgVerifications({ status: RgStatus.PENDING });

            expect(mockPrisma.rgVerification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { status: RgStatus.PENDING },
                })
            );
        });
    });

    describe('getRgVerification', () => {
        it('returns verification with details', async () => {
            const mockVerification = {
                id: 'rg-123',
                user: { id: 'user-1', email: 'test@test.com' },
            };
            mockPrisma.rgVerification.findUnique.mockResolvedValue(mockVerification);

            const result = await service.getRgVerification('rg-123');

            expect(result.id).toBe('rg-123');
            expect(result.user).toBeDefined();
        });

        it('throws NotFoundException when not found', async () => {
            mockPrisma.rgVerification.findUnique.mockResolvedValue(null);

            await expect(service.getRgVerification('nonexistent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('approveRg', () => {
        const verificationId = 'rg-123';
        const adminId = 'admin-456';

        it('approves pending verification', async () => {
            mockPrisma.rgVerification.findUnique.mockResolvedValue({
                id: verificationId,
                status: RgStatus.PENDING,
            });
            mockPrisma.rgVerification.update.mockResolvedValue({
                id: verificationId,
                status: RgStatus.APPROVED,
                reviewedAt: new Date(),
                reviewedByAdminId: adminId,
            });

            const result = await service.approveRg(verificationId, adminId);

            expect(result.status).toBe(RgStatus.APPROVED);
            expect(result.reviewedByAdminId).toBe(adminId);
        });

        it('throws BadRequestException when already processed', async () => {
            mockPrisma.rgVerification.findUnique.mockResolvedValue({
                id: verificationId,
                status: RgStatus.APPROVED,
            });

            await expect(service.approveRg(verificationId, adminId))
                .rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException when not found', async () => {
            mockPrisma.rgVerification.findUnique.mockResolvedValue(null);

            await expect(service.approveRg(verificationId, adminId))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('rejectRg', () => {
        const verificationId = 'rg-123';
        const adminId = 'admin-456';
        const reason = 'Document illegible';

        it('rejects pending verification with reason', async () => {
            mockPrisma.rgVerification.findUnique.mockResolvedValue({
                id: verificationId,
                status: RgStatus.PENDING,
            });
            mockPrisma.rgVerification.update.mockResolvedValue({
                id: verificationId,
                status: RgStatus.REJECTED,
                adminReason: reason,
            });

            const result = await service.rejectRg(verificationId, adminId, reason);

            expect(result.status).toBe(RgStatus.REJECTED);
            expect(result.adminReason).toBe(reason);
        });

        it('throws BadRequestException when already processed', async () => {
            mockPrisma.rgVerification.findUnique.mockResolvedValue({
                id: verificationId,
                status: RgStatus.REJECTED,
            });

            await expect(service.rejectRg(verificationId, adminId))
                .rejects.toThrow(BadRequestException);
        });
    });
});
