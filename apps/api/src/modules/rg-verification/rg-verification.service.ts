import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RgStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RgQueryDto } from './dto/rg-query.dto';

@Injectable()
export class RgVerificationService {
    constructor(private readonly prisma: PrismaService) { }

    async submitRg(userId: string, rgNumber: string, rgPhotoUrl: string) {
        // Check for existing pending verification
        const existing = await this.prisma.rgVerification.findFirst({
            where: {
                userId,
                status: RgStatus.PENDING,
            },
        });

        if (existing) {
            throw new BadRequestException(
                'Você já possui uma verificação de RG pendente. Aguarde a análise.',
            );
        }

        return this.prisma.rgVerification.create({
            data: {
                userId,
                rgNumber,
                rgPhotoUrl,
                status: RgStatus.PENDING,
            },
        });
    }

    async getUserCurrentRg(userId: string) {
        // Get the most recent verification
        return this.prisma.rgVerification.findFirst({
            where: { userId },
            orderBy: { submittedAt: 'desc' },
        });
    }

    async listRgVerifications(query: RgQueryDto) {
        return this.prisma.rgVerification.findMany({
            where: {
                status: query.status,
            },
            include: {
                user: {
                    select: { id: true, email: true, fullName: true },
                },
                reviewedByAdmin: {
                    select: { id: true, email: true },
                },
            },
            orderBy: { submittedAt: 'desc' },
            skip: query.skip,
            take: query.take ?? 50,
        });
    }

    async getRgVerification(verificationId: string) {
        const verification = await this.prisma.rgVerification.findUnique({
            where: { id: verificationId },
            include: {
                user: {
                    select: { id: true, email: true, fullName: true, avatarUrl: true },
                },
                reviewedByAdmin: {
                    select: { id: true, email: true },
                },
            },
        });

        if (!verification) {
            throw new NotFoundException('Verificação não encontrada.');
        }

        return verification;
    }

    async approveRg(verificationId: string, adminId: string) {
        const verification = await this.prisma.rgVerification.findUnique({
            where: { id: verificationId },
        });

        if (!verification) {
            throw new NotFoundException('Verificação não encontrada.');
        }

        if (verification.status !== RgStatus.PENDING) {
            throw new BadRequestException('Esta verificação já foi processada.');
        }

        return this.prisma.rgVerification.update({
            where: { id: verificationId },
            data: {
                status: RgStatus.APPROVED,
                reviewedAt: new Date(),
                reviewedByAdminId: adminId,
            },
            include: {
                user: {
                    select: { id: true, email: true, fullName: true },
                },
            },
        });
    }

    async rejectRg(verificationId: string, adminId: string, reason?: string) {
        const verification = await this.prisma.rgVerification.findUnique({
            where: { id: verificationId },
        });

        if (!verification) {
            throw new NotFoundException('Verificação não encontrada.');
        }

        if (verification.status !== RgStatus.PENDING) {
            throw new BadRequestException('Esta verificação já foi processada.');
        }

        return this.prisma.rgVerification.update({
            where: { id: verificationId },
            data: {
                status: RgStatus.REJECTED,
                reviewedAt: new Date(),
                reviewedByAdminId: adminId,
                adminReason: reason,
            },
            include: {
                user: {
                    select: { id: true, email: true, fullName: true },
                },
            },
        });
    }
}
