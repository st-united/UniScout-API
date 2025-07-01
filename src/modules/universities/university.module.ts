import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversityController } from './university.controller';
import { UniversityService } from './university.service';
import { IsCountryValidConstraint, IsOtherFieldUnique, IsSubjectValid, IsUniqueConstraint } from './validator';
import { CsvImport } from './csv-import';
import { UniEntity } from './entities/uni.entity';
import { SubjectEntity } from './entities/subject.entity';
import { AcademicFieldEntity } from './entities/academic-field.entity';
import { DashboardModule } from '@DashboardModule/dashboard.module';

@Module({
  imports: [TypeOrmModule.forFeature([UniEntity, SubjectEntity, AcademicFieldEntity]), DashboardModule],
  controllers: [UniversityController],
  providers: [
    UniversityService,
    CsvImport,
    IsCountryValidConstraint,
    IsSubjectValid,
    IsUniqueConstraint,
    IsOtherFieldUnique,
  ],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
