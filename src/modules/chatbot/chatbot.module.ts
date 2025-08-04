import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ConfigModule } from '@nestjs/config';
import { UniversityDataService } from './university-data.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniEntity } from '@UniversitiesModule/entities';
import { SubjectEntity } from '@UniversitiesModule/entities/subject.entity';
import { AcademicFieldEntity } from '@UniversitiesModule/entities/academic-field.entity';
import { PdfService } from './pdf.service';
import { ExcelService } from './excel.service';
import { CsvService } from './csv.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UniEntity, SubjectEntity, AcademicFieldEntity])],
  controllers: [ChatbotController],
  providers: [ChatbotService, UniversityDataService, PdfService, CsvService, ExcelService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
