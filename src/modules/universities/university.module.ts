import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UniversityController } from './university.controller';
import { UniversityService } from './university.service';
import { CsvImport } from './csv-import';

import { UniEntity } from './entities/uni.entity';
import { LocationEntity } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([UniEntity, LocationEntity])],
  controllers: [UniversityController],
  providers: [UniversityService, CsvImport],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
