import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

/**
 * Board snapshots embed their assets (pasted images, imported PDF pages) as
 * data URLs, so they routinely run to several megabytes. Express defaults to
 * 100kb, which rejects any board with a picture on it.
 */
const MAX_BODY_SIZE = '25mb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(json({ limit: MAX_BODY_SIZE }));
  app.use(urlencoded({ limit: MAX_BODY_SIZE, extended: true }));

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = configService.get<string>('PORT') ?? '3000';
  // Render, Railway and Fly route traffic to the container's external
  // interface; binding the default loopback would make the health check fail.
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
