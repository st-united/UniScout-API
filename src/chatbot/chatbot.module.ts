import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { UniversitiesModule } from '@UniversitiesModule/university.module';

@Module({
  imports: [
    ConfigModule,
    UniversitiesModule, // Import to access UniversityService
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
