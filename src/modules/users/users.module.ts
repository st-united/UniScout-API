// src/modules/users/users.module.ts (or src/users/users.module.ts)
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UsersController } from '@UsersModule/users.controller';
import { UserEntity } from './entities';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    ConfigModule, // <--- ADD THIS LINE to make ConfigService available
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
