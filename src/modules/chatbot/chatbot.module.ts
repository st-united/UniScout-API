// src/chatbot/chatbot.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { UniversityDataService } from './university-data.service';
import { UniEntity } from '@UniversitiesModule/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([UniEntity]), // Register UniEntity with TypeORM for this module
  ],
  controllers: [ChatbotController],
  providers: [ChatbotService, UniversityDataService], // Add UniversityDataService
  exports: [ChatbotService],
})
export class ChatbotModule {}
