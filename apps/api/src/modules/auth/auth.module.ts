import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DiscordAccountService } from './discord-account.service';
import { DiscordAuthService } from './discord-auth.service';
import { DiscordOAuthService } from './discord-oauth.service';
import { GoogleAccountService } from './google-account.service';
import { GoogleAuthService } from './google-auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('TOKEN_TTL'),
        },
      }),
    }),
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    DiscordOAuthService,
    DiscordAccountService,
    DiscordAuthService,
    GoogleOAuthService,
    GoogleAccountService,
    GoogleAuthService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
