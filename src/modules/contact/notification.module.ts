import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ContactSubmissionEntity, NotificationEntity } from '../contact/entities';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, ContactSubmissionEntity])],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
