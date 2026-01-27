import {
    Body,
    Controller,
    Get,
    Param,
    Post,
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
import { RgQueryDto } from './dto/rg-query.dto';
import { RejectRgDto } from './dto/reject-rg.dto';
import { RgVerificationService } from './rg-verification.service';

type AuthenticatedRequest = Request & { user?: JwtPayload };

@Controller('admin/rg')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.rg')
export class AdminRgVerificationController {
    constructor(private readonly rgService: RgVerificationService) { }

    @Get()
    list(@Query() query: RgQueryDto) {
        return this.rgService.listRgVerifications(query);
    }

    @Get(':id')
    get(@Param('id') verificationId: string) {
        return this.rgService.getRgVerification(verificationId);
    }

    @Post(':id/approve')
    approve(@Req() req: AuthenticatedRequest, @Param('id') verificationId: string) {
        const adminId = this.getUserId(req);
        return this.rgService.approveRg(verificationId, adminId);
    }

    @Post(':id/reject')
    reject(
        @Req() req: AuthenticatedRequest,
        @Param('id') verificationId: string,
        @Body() dto: RejectRgDto,
    ) {
        const adminId = this.getUserId(req);
        return this.rgService.rejectRg(verificationId, adminId, dto.reason);
    }

    private getUserId(request: AuthenticatedRequest) {
        if (!request.user?.sub) {
            throw new UnauthorizedException('Contexto de usuário ausente.');
        }
        return request.user.sub;
    }
}
