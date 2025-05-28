import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UniversityController } from './university.controller';
import { UniversityService } from './university.service';
import { CsvImport } from './csv-import';

import { AusUniEntity } from './entities/aus.entity';
import { IndUniEntity } from './entities/ind.entity';
import { JapUniEntity } from './entities/jap.entity';
import { KorUniEntity } from './entities/kor.entity';
import { UsaUniEntity } from './entities/usa.entity';
import { VnUniEntity } from './entities/vn.entity';
import { LocationEntity } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AusUniEntity,
      IndUniEntity,
      JapUniEntity,
      KorUniEntity,
      UsaUniEntity,
      VnUniEntity,
      LocationEntity,
    ]),
  ],

  controllers: [UniversityController],
  providers: [UniversityService, CsvImport],
  exports: [UniversityService, CsvImport],
})
export class UniversitiesModule {}
