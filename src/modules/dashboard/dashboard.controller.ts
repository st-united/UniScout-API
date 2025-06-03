import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('country-distribution')
  getCountryDistribution() {
    return this.dashboardService.countByCountry();
  }

  @Get('top-ranked')
  getTopRanked(@Query('limit') limit: number) {
    return this.dashboardService.topRanked(limit ?? 10);
  }

  @Get('subjects')
  getSubjectStats() {
    return this.dashboardService.subjectStats();
  }

  @Get('top-searched')
  getTopSearched(@Query('limit') limit: number) {
    return this.dashboardService.getTopSearched(limit ?? 10);
  }

  @Get('traffic')
  getTrafficByCountry(@Query('limit') limit: number) {
    return this.dashboardService.getTrafficByCountry(limit ?? 10);
  }
}
