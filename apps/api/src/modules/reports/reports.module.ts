import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminProfileReportsController } from './admin-profile-reports.controller';
import { ProfileReportsController } from './profile-reports.controller';
import { ReportsService } from './reports.service';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [
        ReportsController,
        ProfileReportsController,
        AdminReportsController,
        AdminProfileReportsController,
    ],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule { }
