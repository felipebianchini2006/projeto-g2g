import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AdminPermission } from '../auth/decorators/admin-permission.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminPermissionsGuard } from '../auth/guards/admin-permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto';
import { AuditLogsService } from './audit-logs.service';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionsGuard)
@Roles(UserRole.ADMIN, UserRole.AJUDANTE)
@AdminPermission('admin.audit')
export class AdminAuditController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  list(@Query() query: AuditLogsQueryDto) {
    return this.auditLogsService.listLogs(query);
  }
}
