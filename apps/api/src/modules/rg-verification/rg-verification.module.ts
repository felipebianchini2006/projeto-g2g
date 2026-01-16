import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RgVerificationController } from './rg-verification.controller';
import { AdminRgVerificationController } from './admin-rg-verification.controller';
import { RgVerificationService } from './rg-verification.service';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [RgVerificationController, AdminRgVerificationController],
    providers: [RgVerificationService],
    exports: [RgVerificationService],
})
export class RgVerificationModule { }
