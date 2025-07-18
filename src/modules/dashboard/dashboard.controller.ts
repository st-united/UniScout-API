import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserOverviewDto } from './dto/user-overview.dto';
import { UserRole } from '@Constant/enums';
import { Roles } from '@AuthModule/decorators/roles.decorator';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SubmissionStatusEnum } from '@ContactModule/entities';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly _dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Total university, Total visits, Contact count' })
  getSummary() {
    return this._dashboardService.getSummary();
  }

  @Get('country-distribution')
  @ApiOperation({ summary: 'Breakdown of universities by country' })
  getCountryDistribution() {
    return this._dashboardService.countByCountry();
  }

  @Get('top-ranked')
  getTopRankedByCountry(@Query('limit') limit: number) {
    return this._dashboardService.topRankedPerCountry(limit ?? 3);
  }

  @Get('contact-status')
  @ApiOperation({ summary: 'Get breakdown of contact requests by status' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Filter by month (1-12)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatusEnum, description: 'Filter by specific status' })
  async getContactStatusBreakdown(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: SubmissionStatusEnum
  ) {
    return this._dashboardService.getContactStatusBreakdown(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
      status
    );
  }

  @Get('top-searched')
  @ApiOperation({ summary: 'Top searched universities' })
  getTopSearched(@Query('limit') limit: string) {
    return this._dashboardService.getTopSearched(Number(limit) || 5);
  }

  @Get('visit-filter')
  @ApiOperation({ summary: 'Get total website accesses filtered by month and year' })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Filter by month (1-12)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
  getFilteredWebsiteAccesses(@Query('month') month?: string, @Query('year') year?: string) {
    return this._dashboardService.getFilteredWebsiteAccesses(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined
    );
  }

  @Get('users-overview')
  @Roles(UserRole.SUPER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get an overview of user statistics by status' })
  @ApiResponse({ status: 200, description: 'User overview fetched successfully', type: UserOverviewDto })
  getUserOverview() {
    return this._dashboardService.getUserOverview();
  }
}
