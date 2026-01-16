import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async createReport(userId: string, listingId: string, dto: CreateReportDto) {
        const listing = await this.prisma.listing.findUnique({
            where: { id: listingId },
        });

        if (!listing) {
            throw new NotFoundException('Anúncio não encontrado.');
        }

        // Check if user already reported this listing
        const existingReport = await this.prisma.listingReport.findFirst({
            where: {
                listingId,
                reporterId: userId,
                status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] },
            },
        });

        if (existingReport) {
            throw new BadRequestException('Você já denunciou este anúncio. Aguarde a análise.');
        }

        return this.prisma.listingReport.create({
            data: {
                listingId,
                reporterId: userId,
                reason: dto.reason,
                message: dto.message,
            },
        });
    }

    async listReports(query: ReportQueryDto) {
        return this.prisma.listingReport.findMany({
            where: {
                status: query.status,
            },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        sellerId: true,
                        seller: { select: { id: true, email: true } },
                    },
                },
                reporter: {
                    select: { id: true, email: true },
                },
                reviewedByAdmin: {
                    select: { id: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: query.skip,
            take: query.take ?? 50,
        });
    }

    async getReport(reportId: string) {
        const report = await this.prisma.listingReport.findUnique({
            where: { id: reportId },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        status: true,
                        sellerId: true,
                        priceCents: true,
                        currency: true,
                        seller: { select: { id: true, email: true } },
                    },
                },
                reporter: {
                    select: { id: true, email: true },
                },
                reviewedByAdmin: {
                    select: { id: true, email: true },
                },
            },
        });

        if (!report) {
            throw new NotFoundException('Denúncia não encontrada.');
        }

        return report;
    }

    async updateReport(reportId: string, adminId: string, dto: UpdateReportDto) {
        const report = await this.prisma.listingReport.findUnique({
            where: { id: reportId },
        });

        if (!report) {
            throw new NotFoundException('Denúncia não encontrada.');
        }

        const data: Record<string, unknown> = {
            reviewedByAdminId: adminId,
            updatedAt: new Date(),
        };

        if (dto.status !== undefined) {
            data['status'] = dto.status;
            if (dto.status === ReportStatus.RESOLVED || dto.status === ReportStatus.REJECTED) {
                data['resolvedAt'] = new Date();
            }
        }

        if (dto.adminNote !== undefined) {
            data['adminNote'] = dto.adminNote;
        }

        return this.prisma.listingReport.update({
            where: { id: reportId },
            data,
            include: {
                listing: {
                    select: { id: true, title: true, status: true },
                },
                reporter: {
                    select: { id: true, email: true },
                },
                reviewedByAdmin: {
                    select: { id: true, email: true },
                },
            },
        });
    }
}
