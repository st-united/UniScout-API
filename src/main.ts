import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { useContainer } from 'class-validator';
import { ExpressAdapter } from '@nestjs/platform-express';

import 'dotenv/config';
import 'reflect-metadata';

import { AppModule } from '@app/app.module';

async function bootstrap() {
  const appOptions = { cors: true };
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), appOptions);
  const configService = app.get(ConfigService);

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // Prefix
  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .setTitle('Uni-Scout')
    .setDescription('The Uni-Scout API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/docs', app, document);

  const port = configService.get<number>('APP_PORT');
  await app.listen(port || 6002);
}

bootstrap();
