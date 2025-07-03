import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly _dashboardService: DashboardService) {}

  @Get('summary')
  getSummary() {
    return this._dashboardService.getSummary();
  }

  @Get('country-distribution')
  getCountryDistribution() {
    return this._dashboardService.countByCountry();
  }

  @Get('top-ranked')
  getTopRankedByCountry(@Query('limit') limit: number) {
    return this._dashboardService.topRankedPerCountry(limit ?? 3);
  }

  @Get('subjects')
  getSubjectStats() {
    return this._dashboardService.subjectStats();
  }

  @Get('top-searched')
  getTopSearched(@Query('limit') limit: string) {
    return this._dashboardService.getTopSearched(Number(limit) || 5);
  }

  @Get('traffic')
  getTrafficByCountry(@Query('limit') limit: string) {
    return this._dashboardService.getTrafficByCountry(Number(limit) || 10);
  }
}
