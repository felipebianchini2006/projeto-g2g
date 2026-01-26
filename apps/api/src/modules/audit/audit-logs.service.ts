import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(query: AuditLogsQueryDto) {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.actorId) {
      where.adminId = query.actorId;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: query.dateFrom } : {}),
        ...(query.dateTo ? { lte: query.dateTo } : {}),
      };
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, skip, take };
  }
}
