import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ConfigService } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { UniversitiesModule } from '@UniversitiesModule/university.module';

@Module({
  imports: [UniversitiesModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, ConfigService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
