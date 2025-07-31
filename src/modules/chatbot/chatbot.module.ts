// src/modules/chatbot/chatbot.module.ts
import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ConfigModule } from '@nestjs/config';
import { UniversityDataService } from './university-data.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UniEntity } from '@UniversitiesModule/entities';
import { SubjectEntity } from '@UniversitiesModule/entities/subject.entity'; // Assuming this path
import { AcademicFieldEntity } from '@UniversitiesModule/entities/academic-field.entity'; // Assuming this path
import { PdfService } from './pdf.service'; // <--- ADD THIS IMPORT
import { ExcelService } from './excel.service';
import { CsvService } from './csv.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UniEntity, SubjectEntity, AcademicFieldEntity]), // Ensure all entities used are here
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    UniversityDataService,
    PdfService,
    CsvService,
    ExcelService, // <--- ADD PDFSERVICE TO PROVIDERS
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
