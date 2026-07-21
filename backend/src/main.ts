import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const rawCorsOrigin = process.env.CORS_ORIGIN?.trim();
  const corsOrigin = !rawCorsOrigin || rawCorsOrigin === '*'
    ? true
    : rawCorsOrigin.includes(',')
      ? rawCorsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
      : rawCorsOrigin;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
