import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './university.controller';
import { AdminController } from './admin-university.controller';
import { UniversityService } from './university.service';
import { IsCountryValidConstraint, IsUniqueConstraint } from './validator';
import { CsvImport } from './csv-import';
import { UniEntity } from './entities/uni.entity';
import { SubjectEntity } from './entities/subject.entity';
import { AcademicFieldEntity } from './entities/academic-field.entity';
import { DashboardModule } from '@DashboardModule/dashboard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UniEntity, SubjectEntity, AcademicFieldEntity]),
    forwardRef(() => DashboardModule),
  ],
  controllers: [UserController, AdminController],
  providers: [UniversityService, CsvImport, IsCountryValidConstraint, IsUniqueConstraint],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
