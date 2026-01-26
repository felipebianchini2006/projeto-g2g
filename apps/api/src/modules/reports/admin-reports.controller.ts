import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Query,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/auth.types';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/reports/listings')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.reports.listings')
export class AdminReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    list(@Query() query: ReportQueryDto) {
        return this.reportsService.listReports(query);
    }

    @Get(':id')
    get(@Param('id') reportId: string) {
        return this.reportsService.getReport(reportId);
    }

    @Patch(':id')
    update(
        @Req() req: AuthenticatedRequest,
        @Param('id') reportId: string,
        @Body() dto: UpdateReportDto,
    ) {
        const adminId = this.getUserId(req);
        return this.reportsService.updateReport(reportId, adminId, dto);
    }

    private getUserId(request: AuthenticatedRequest) {
        if (!request.user?.sub) {
            throw new UnauthorizedException('Missing user context.');
        }
        return request.user.sub;
    }
}
