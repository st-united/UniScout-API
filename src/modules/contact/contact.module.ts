import { forwardRef, Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { AdminContactController } from './admin-contact.controller';
import { ContactService } from './contact.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactSubmissionEntity } from './entities';
import { AcademicFieldEntity, SubjectEntity, UniEntity } from '@UniversitiesModule/entities';
import { UniversitiesModule } from '@UniversitiesModule/university.module';
import { NotificationModule } from './notification.module';
import { UserEntity } from '@UsersModule/entities';

@Module({
  imports: [
    MulterModule.register({}),
    ConfigModule,
    TypeOrmModule.forFeature([ContactSubmissionEntity, UniEntity, SubjectEntity, AcademicFieldEntity, UserEntity]),
    forwardRef(() => UniversitiesModule),
    NotificationModule,
  ],
  controllers: [ContactController, AdminContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
