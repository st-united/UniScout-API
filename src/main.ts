import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'dotenv/config';
import 'reflect-metadata';

import * as express from 'express';
import { join } from 'path';

import { AppModule } from '@app/app.module';

async function bootstrap() {
  const appOptions = { cors: true };
  const app = await NestFactory.create(AppModule, appOptions);

  const configService = app.get(ConfigService);

  // Global Validation Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Serve static files (e.g. uploaded logos)
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Global API prefix
  app.setGlobalPrefix('api');

  // Swagger setup
  const options = new DocumentBuilder()
    .setTitle('AICP')
    .setDescription('The AICP API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/docs', app, document);

  const port = configService.get<number>('APP_PORT');
  await app.listen(port || 6002);
}

bootstrap();
