import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportStatus, ReportReason } from '@prisma/client';

describe('ReportsService', () => {
    let service: ReportsService;
    let prisma: jest.Mocked<PrismaService>;

    const mockPrisma = {
        listing: {
            findUnique: jest.fn(),
        },
        listingReport: {
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
                ReportsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
        prisma = module.get(PrismaService);
    });

    describe('createReport', () => {
        const userId = 'user-123';
        const listingId = 'listing-456';
        const dto = { reason: 'SCAM' as ReportReason, message: 'Suspicious listing' };

        it('creates a report successfully', async () => {
            mockPrisma.listing.findUnique.mockResolvedValue({ id: listingId });
            mockPrisma.listingReport.findFirst.mockResolvedValue(null);
            mockPrisma.listingReport.create.mockResolvedValue({
                id: 'report-789',
                listingId,
                reporterId: userId,
                reason: dto.reason,
                message: dto.message,
                status: ReportStatus.OPEN,
            });

            const result = await service.createReport(userId, listingId, dto);

            expect(result.id).toBe('report-789');
            expect(result.status).toBe(ReportStatus.OPEN);
            expect(mockPrisma.listingReport.create).toHaveBeenCalledWith({
                data: {
                    listingId,
                    reporterId: userId,
                    reason: dto.reason,
                    message: dto.message,
                },
            });
        });

        it('throws NotFoundException when listing does not exist', async () => {
            mockPrisma.listing.findUnique.mockResolvedValue(null);

            await expect(service.createReport(userId, listingId, dto))
                .rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException when user already has pending report', async () => {
            mockPrisma.listing.findUnique.mockResolvedValue({ id: listingId });
            mockPrisma.listingReport.findFirst.mockResolvedValue({ id: 'existing-report' });

            await expect(service.createReport(userId, listingId, dto))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('listReports', () => {
        it('lists all reports', async () => {
            const mockReports = [
                { id: 'report-1', status: ReportStatus.OPEN },
                { id: 'report-2', status: ReportStatus.REVIEWING },
            ];
            mockPrisma.listingReport.findMany.mockResolvedValue(mockReports);

            const result = await service.listReports({});

            expect(result).toHaveLength(2);
            expect(mockPrisma.listingReport.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderBy: { createdAt: 'desc' },
                })
            );
        });

        it('filters by status', async () => {
            mockPrisma.listingReport.findMany.mockResolvedValue([]);

            await service.listReports({ status: ReportStatus.OPEN });

            expect(mockPrisma.listingReport.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { status: ReportStatus.OPEN },
                })
            );
        });
    });

    describe('getReport', () => {
        it('returns report with details', async () => {
            const mockReport = {
                id: 'report-123',
                listing: { id: 'listing-1', title: 'Test' },
                reporter: { id: 'user-1', email: 'test@test.com' },
            };
            mockPrisma.listingReport.findUnique.mockResolvedValue(mockReport);

            const result = await service.getReport('report-123');

            expect(result.id).toBe('report-123');
            expect(result.listing).toBeDefined();
        });

        it('throws NotFoundException when report not found', async () => {
            mockPrisma.listingReport.findUnique.mockResolvedValue(null);

            await expect(service.getReport('nonexistent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('updateReport', () => {
        const reportId = 'report-123';
        const adminId = 'admin-456';

        it('updates report status', async () => {
            mockPrisma.listingReport.findUnique.mockResolvedValue({ id: reportId });
            mockPrisma.listingReport.update.mockResolvedValue({
                id: reportId,
                status: ReportStatus.RESOLVED,
                reviewedByAdminId: adminId,
                resolvedAt: new Date(),
            });

            const result = await service.updateReport(reportId, adminId, {
                status: ReportStatus.RESOLVED,
            });

            expect(result.status).toBe(ReportStatus.RESOLVED);
        });

        it('adds admin note', async () => {
            mockPrisma.listingReport.findUnique.mockResolvedValue({ id: reportId });
            mockPrisma.listingReport.update.mockResolvedValue({
                id: reportId,
                adminNote: 'Reviewed and confirmed',
            });

            const result = await service.updateReport(reportId, adminId, {
                adminNote: 'Reviewed and confirmed',
            });

            expect(result.adminNote).toBe('Reviewed and confirmed');
        });

        it('throws NotFoundException when report not found', async () => {
            mockPrisma.listingReport.findUnique.mockResolvedValue(null);

            await expect(service.updateReport(reportId, adminId, { status: ReportStatus.RESOLVED }))
                .rejects.toThrow(NotFoundException);
        });
    });
});
