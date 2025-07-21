import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

import 'dotenv/config';
import 'reflect-metadata';

import { AppModule } from '@app/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const appOptions = { cors: true };
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), appOptions);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // Prefix
  app.setGlobalPrefix('api');

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  const options = new DocumentBuilder()
    .setTitle('Uni-Scout')
    .setDescription('The Uni-Scout API description')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token (e.g., "eyJhbGciOiJIUzI1NiI...").',
      },
      'JWT-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/docs', app, document);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/static/',
  });
  const port = configService.get<number>('APP_PORT');
  await app.listen(port || 6002);
}

bootstrap();
