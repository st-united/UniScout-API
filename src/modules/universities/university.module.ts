import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UniversityController } from './university.controller';
import { UniversityService } from './university.service';
import { CsvImport } from './csv-import';

import { UniEntity } from './entities';

import { DashboardModule } from '@DashboardModule/dashboard.module';

@Module({
  imports: [TypeOrmModule.forFeature([UniEntity]), DashboardModule],
  controllers: [UniversityController],
  providers: [UniversityService, CsvImport],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
