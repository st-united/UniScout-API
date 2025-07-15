import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { AdminContactController } from './admin-contact.controller';
import { ContactService } from './contact.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactSubmissionEntity } from './entities';
import { UniEntity } from '@UniversitiesModule/entities';

@Module({
  imports: [MulterModule.register({}), ConfigModule, TypeOrmModule.forFeature([ContactSubmissionEntity, UniEntity])],
  controllers: [ContactController, AdminContactController],
  providers: [ContactService],
})
export class ContactModule {}
