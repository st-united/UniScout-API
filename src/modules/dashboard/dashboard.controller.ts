import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserOverviewDto } from './dto/user-overview.dto';
import { UserRole } from '@Constant/enums';
import { Roles } from '@AuthModule/decorators/roles.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResponseItem } from '@app/common/dtos';

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
  @Get('users-overview')
  @Roles(UserRole.SUPER, UserRole.ADMIN) // Only SUPER and ADMIN can access this
  @ApiOperation({ summary: 'Get an overview of user statistics by status' })
  @ApiResponse({ status: 200, description: 'User overview data', type: UserOverviewDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Insufficient role)' })
  async getUserOverview(): Promise<ResponseItem<UserOverviewDto>> {
    return this._dashboardService.getUserOverview();
  }
}
