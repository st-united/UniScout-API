import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '@UsersModule/entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_POSTGRE_HOST'),
        port: configService.get<number>('DB_POSTGRE_PORT'),
        database: configService.get<string>('DB_POSTGRE_DATABASE'),
        username: configService.get<string>('DB_POSTGRE_USERNAME'),
        password: configService.get<string>('DB_POSTGRE_PASSWORD'),
        synchronize: configService.get<boolean>('DB_POSTGRE_SYNCHRONIZE'),
        logging: configService.get<boolean>('DB_POSTGRE_LOGGING'),
        entities: [UserEntity],
      }),
    }),
  ],
})
export class DatabaseModule {}
