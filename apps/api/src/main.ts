import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const portEnv = process.env['PORT'];
  const parsedPort = portEnv ? Number(portEnv) : 3000;
  const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;
  await app.listen(port);
}
bootstrap();
