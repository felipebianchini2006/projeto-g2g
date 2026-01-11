import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

export const createTestApp = async <T = any>(
  moduleFixture: TestingModule,
): Promise<INestApplication<T>> => {
  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();
  return app as INestApplication<T>;
};
