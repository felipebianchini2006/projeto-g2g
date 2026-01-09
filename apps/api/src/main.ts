import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { join } from 'path';

import { AppModule } from './app.module';
import { AppLogger } from './modules/logger/logger.service';
import { PrismaService } from './modules/prisma/prisma.service';
import { RequestContextInterceptor } from './modules/request-context/request-context.interceptor';
import { RequestContextService } from './modules/request-context/request-context.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  const logger = app.get(AppLogger);
  app.useLogger(logger);
  const configService = app.get(ConfigService);
  const requestContext = app.get(RequestContextService);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestIdHeader = req.headers['x-request-id'];
    const requestId =
      (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ?? randomUUID();
    const correlationHeader = req.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(correlationHeader) ? correlationHeader[0] : correlationHeader) ?? requestId;

    requestContext.run({ requestId, correlationId }, () => {
      res.setHeader('x-request-id', requestId);
      res.setHeader('x-correlation-id', correlationId);
      next();
    });
  });

  app.useGlobalInterceptors(new RequestContextInterceptor(requestContext));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOriginsRaw = configService.get<string>('CORS_ORIGINS') ?? '';
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const defaultOrigins = isProduction
    ? []
    : ['*', 'http://localhost:3000', 'http://127.0.0.1:3000'];
  const corsOrigins = corsOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = corsOrigins.length ? corsOrigins : defaultOrigins;
  const allowAnyOrigin = allowedOrigins.includes('*');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowAnyOrigin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const port = configService.get<number>('PORT') ?? 3001;
  await app.listen(port);

  logger.log(`API listening on port ${port}`, 'Bootstrap');
}
bootstrap();
