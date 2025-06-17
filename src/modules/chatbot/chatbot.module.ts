import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { UniversitiesModule } from '@UniversitiesModule/university.module';
import { FileExportService } from './file-export/file-export.service';

@Module({
  imports: [ConfigModule, UniversitiesModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, FileExportService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
