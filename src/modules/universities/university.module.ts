import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversityController } from './university.controller';
import { UniversityService } from './university.service';
import { IsCountryValidConstraint } from './validator';
import { CsvImport } from './csv-import';
import { UniEntity } from './entities';
import { DashboardModule } from '@DashboardModule/dashboard.module';

@Module({
  imports: [TypeOrmModule.forFeature([UniEntity]), DashboardModule],
  controllers: [UniversityController],
  providers: [UniversityService, CsvImport, IsCountryValidConstraint],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
