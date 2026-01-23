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
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/reports/profiles')
@UseGuards(JwtAuthGuard)
export class AdminProfileReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    list(@Query() query: ReportQueryDto) {
        return this.reportsService.listProfileReports(query);
    }

    @Get(':id')
    get(@Param('id') reportId: string) {
        return this.reportsService.getProfileReport(reportId);
    }

    @Patch(':id')
    update(
        @Req() req: AuthenticatedRequest,
        @Param('id') reportId: string,
        @Body() dto: UpdateReportDto,
    ) {
        const adminId = this.getUserId(req);
        return this.reportsService.updateProfileReport(reportId, adminId, dto);
    }

    private getUserId(request: AuthenticatedRequest) {
        if (!request.user?.sub) {
            throw new UnauthorizedException('Missing user context.');
        }
        return request.user.sub;
    }
}
