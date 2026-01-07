import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AppLogger } from './modules/logger/logger.service';
import { PrismaService } from './modules/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.init();
  logger.log('Worker running (BullMQ processors)', 'Bootstrap');
}

bootstrap();
