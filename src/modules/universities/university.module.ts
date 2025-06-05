import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniversityController } from './university.controller';
import { UniversityService } from './university.service';
import { IsCountryValidConstraint } from './validator';
import { CsvImport } from './csv-import';
import { UniEntity } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([UniEntity])],
  controllers: [UniversityController],
  providers: [UniversityService, CsvImport, IsCountryValidConstraint],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
