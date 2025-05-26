import { TypeOrmModule } from '@nestjs/typeorm';
import 'dotenv/config';
import { seeder } from 'nestjs-seeder';

import { UserEntity } from '@UsersModule/entities';
import { DatabaseModule } from './config/database.module';

seeder({
  imports: [DatabaseModule, TypeOrmModule.forFeature([UserEntity])],
}).run([]);
