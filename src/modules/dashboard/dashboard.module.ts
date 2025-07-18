import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { DashboardGateway } from './dashboard.gateway';
import { DashboardService } from './dashboard.service';
import { SearchLogEntity, TrackingEntity } from './entities';
import { SearchLogService, TrackingService } from './services';
import { UniEntity } from '@UniversitiesModule/entities';
import { ContactSubmissionEntity } from '@ContactModule/entities';
import { UserEntity } from '@UsersModule/entities';
import { ContactModule } from '@ContactModule/contact.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UniEntity, TrackingEntity, SearchLogEntity, ContactSubmissionEntity]),
    forwardRef(() => ContactModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardGateway, TrackingService, SearchLogService],
  exports: [DashboardService, TrackingService, SearchLogService],
})
export class DashboardModule {}
import { ContactService } from '@ContactModule/contact.service';
