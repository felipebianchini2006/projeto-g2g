import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';
import { ReportsService } from './reports.service';

@Module({
    imports: [PrismaModule],
    controllers: [ReportsController, AdminReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule { }
