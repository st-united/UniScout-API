import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { AdminController } from './admin.controller';
import { UniversityService } from './university.service';
import { IsCountryValidConstraint, IsSubjectValid, IsUniqueConstraint } from './validator';
import { CsvImport } from './csv-import';
import { UniEntity } from './entities/uni.entity';
import { SubjectEntity } from './entities/subject.entity';
import { AcademicFieldEntity } from './entities/academic-field.entity';
import { DashboardModule } from '@DashboardModule/dashboard.module';

@Module({
  imports: [TypeOrmModule.forFeature([UniEntity, SubjectEntity, AcademicFieldEntity]), DashboardModule],
  controllers: [UserController, AdminController],
  providers: [UniversityService, CsvImport, IsCountryValidConstraint, IsSubjectValid, IsUniqueConstraint],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
