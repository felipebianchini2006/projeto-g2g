import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminSecurityController } from './admin-security.controller';
import { SecurityService } from './security.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminSecurityController],
  providers: [SecurityService],
})
export class SecurityModule {}
