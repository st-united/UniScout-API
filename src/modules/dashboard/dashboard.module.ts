import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { DashboardGateway } from './dashboard.gateway';
import { DashboardService } from './dashboard.service';
import { SearchLogEntity, TrackingEntity } from './entities';
import { GeoIpService, SearchLogService, TrackingService } from './services';
import { UniEntity } from '@UniversitiesModule/entities';
import { ContactSubmissionEntity } from '@ContactModule/entities';

@Module({
  imports: [TypeOrmModule.forFeature([UniEntity, TrackingEntity, SearchLogEntity, ContactSubmissionEntity])],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardGateway, TrackingService, GeoIpService, SearchLogService],
  exports: [DashboardService, TrackingService, GeoIpService, SearchLogService],
})
export class DashboardModule {}
