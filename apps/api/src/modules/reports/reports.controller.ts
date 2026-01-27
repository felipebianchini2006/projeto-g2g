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

@Controller('listings/:listingId/report')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Post()
    create(
        @Req() req: AuthenticatedRequest,
        @Param('listingId') listingId: string,
        @Body() dto: CreateReportDto,
    ) {
        const userId = this.getUserId(req);
        return this.reportsService.createReport(userId, listingId, dto);
    }

    private getUserId(request: AuthenticatedRequest) {
        if (!request.user?.sub) {
            throw new UnauthorizedException('Contexto de usuário ausente.');
        }
        return request.user.sub;
    }
}
