import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UniEntity } from '@UniversitiesModule/entities/uni.entity';
import { SearchLogService, TrackingService } from './services';
import { ContactService } from '@ContactModule/contact.service';
import { ContactSubmissionEntity, SubmissionStatusEnum } from '@ContactModule/entities';
import { UserEntity } from '@UsersModule/entities';
import { UserOverviewDto } from './dto/user-overview.dto';
import { ResponseItem } from '@app/common/dtos';
import { StatusEnum, UserRole } from '@Constant/enums';
import { plainToClass } from 'class-transformer';

type StatusCountRow = { status: StatusEnum; count: string };
type CountryCountRow = { country: string; count: string };

const DASHBOARD_ALLOWED_ROLES = [UserRole.ADMIN, UserRole.USER] as const;

@Injectable()
export class DashboardService {
  logger: any;
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UniEntity)
    private readonly _uniRepo: Repository<UniEntity>,
    @InjectRepository(ContactSubmissionEntity)
    private readonly _contactSubmissionRepo: Repository<ContactSubmissionEntity>,
    private readonly _searchLogService: SearchLogService,
    private readonly _trackingService: TrackingService,
    private readonly _contactService: ContactService
  ) {}

  async getSummary() {
    const universityCount = await this._uniRepo.count();
    const contactCount = await this._contactSubmissionRepo.count();
    const totalVisits = await this._trackingService.getTotalWebsiteAccesses();

    return {
      universityCount,
      contactCount,
      totalVisits,
    };
  }

  async countByCountry() {
    const rows = await this._uniRepo
      .createQueryBuilder('u')
      .select('u.country', 'country')
      .addSelect('COUNT(u.id)', 'count')
      .groupBy('u.country')
      .getRawMany<CountryCountRow>();

    return rows.map((r) => ({ country: r.country, count: Number(r.count) || 0 }));
  }

  async topRankedPerCountry(limit: number) {
    return this._uniRepo.find({ take: limit });
  }

  async getContactStatusBreakdown(month?: number, year?: number, status?: SubmissionStatusEnum) {
    return this._contactService.countSubmissionsByStatus(month, year, status);
  }

  async getTopSearched(limit = 5) {
    return this._searchLogService.getTopSearched(limit);
  }

  async getFilteredWebsiteAccesses(month?: number, year?: number) {
    return this._trackingService.getWebsiteAccessesByMonthAndYear(month, year);
  }

  async logHomepageAccess() {
    await this._trackingService.logWebsiteAccess();
  }

  async getUserOverview() {
    const statusCounts = await this.userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.deletedAt IS NULL')
      .andWhere('user.role IN (:...allowedRoles)', { allowedRoles: DASHBOARD_ALLOWED_ROLES })
      .groupBy('user.status')
      .getRawMany<StatusCountRow>();

    const totalUsers = statusCounts.reduce((sum, r) => sum + (Number(r.count) || 0), 0);

    const overview: UserOverviewDto = {
      totalUsers,
      pendingUsers: 0,
      activeUsers: 0,
      deactivatedUsers: 0,
      blockedUsers: 0,
    };

    for (const { status, count } of statusCounts) {
      const n = Number(count) || 0;
      switch (status) {
        case StatusEnum.PENDING:
          overview.pendingUsers = n;
          break;
        case StatusEnum.ACTIVE:
          overview.activeUsers = n;
          break;
        case StatusEnum.INACTIVE:
          overview.deactivatedUsers = n;
          break;
        case StatusEnum.BLOCKED:
          overview.blockedUsers = n;
          break;
      }
    }

    const resultDto = plainToClass(UserOverviewDto, overview, { excludeExtraneousValues: true });
    return new ResponseItem(resultDto, 'User overview fetched successfully');
  }
}
