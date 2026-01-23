import {
    Body,
    Controller,
    Param,
    Post,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('users/:userId/report')
@UseGuards(JwtAuthGuard)
export class ProfileReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Post()
    create(
        @Req() req: AuthenticatedRequest,
        @Param('userId') userId: string,
        @Body() dto: CreateReportDto,
    ) {
        const reporterId = this.getUserId(req);
        return this.reportsService.createProfileReport(reporterId, userId, dto);
    }

    private getUserId(request: AuthenticatedRequest) {
        if (!request.user?.sub) {
            throw new UnauthorizedException('Missing user context.');
        }
        return request.user.sub;
    }
}
