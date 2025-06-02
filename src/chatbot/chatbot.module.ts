import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ConfigService } from '@nestjs/config';
import { UniversitiesModule } from '@UniversitiesModule/university.module';

@Module({
  imports: [UniversitiesModule],
  providers: [ChatbotService, ConfigService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
