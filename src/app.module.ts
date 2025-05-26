import * as Joi from '@hapi/joi';
import { ClassSerializerInterceptor, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { UsersModule } from '@UsersModule/users.module';
import { DatabaseModule } from '@app/config/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { XMLMiddleware } from './common/middleware/xml.middleware';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        APP_PORT: Joi.number().required(),

        DB_POSTGRE_HOST: Joi.string().required(),
        DB_POSTGRE_PORT: Joi.number().required(),
        DB_POSTGRE_USERNAME: Joi.string().required(),
        DB_POSTGRE_PASSWORD: Joi.string().required(),
        DB_POSTGRE_DATABASE: Joi.string().required(),
        DB_POSTGRE_SYNCHRONIZE: Joi.boolean().required(),
        DB_POSTGRE_LOGGING: Joi.boolean().required(),
        JWT_ACCESS_SECRETKEY: Joi.string().required(),
        JWT_ACCESS_EXPIRES: Joi.string().required(),
        JWT_REFRESH_SECRETKEY: Joi.string().required(),
        JWT_REFRESH_EXPIRES: Joi.string().required(),
      }),
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(XMLMiddleware).forRoutes({
      path: 'report-1/import',
      method: RequestMethod.POST,
    });
  }
}
