import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { groupBy } from 'lodash';

import { UniEntity } from '@UniversitiesModule/entities/uni.entity';
import { SearchLogService, TrackingService } from './services';
import { ContactService } from '@ContactModule/contact.service';
import { ContactSubmissionEntity, SubmissionStatusEnum } from '@ContactModule/entities';
import { UserEntity } from '@UsersModule/entities';
import { UserOverviewDto } from './dto/user-overview.dto';
import { ResponseItem } from '@app/common/dtos';
import { StatusEnum } from '@Constant/enums';
import { plainToClass } from 'class-transformer';

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
    const unis = await this._uniRepo.find({ select: ['country'] });
    const grouped = groupBy(unis, 'country');
    return Object.keys(grouped).map((country) => ({
      country,
      count: grouped[country].length,
    }));
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

  async getUserOverview() {
    const totalUsers = await this.userRepository.count({
      where: { deletedAt: null },
    });

    const statusCounts = await this.userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(user.id)', 'count')
      .where('user.deletedAt IS NULL')
      .groupBy('user.status')
      .getRawMany();

    const overview: UserOverviewDto = {
      totalUsers: totalUsers,
      pendingUsers: 0,
      activeUsers: 0,
      deactivatedUsers: 0,
      blockedUsers: 0,
    };

    statusCounts.forEach((row) => {
      switch (row.status) {
        case StatusEnum.PENDING:
          overview.pendingUsers = parseInt(row.count, 10);
          break;
        case StatusEnum.ACTIVE:
          overview.activeUsers = parseInt(row.count, 10);
          break;
        case StatusEnum.INACTIVE:
          overview.deactivatedUsers = parseInt(row.count, 10);
          break;
        case StatusEnum.BLOCKED:
          overview.blockedUsers = parseInt(row.count, 10);
          break;
      }
    });

    const resultDto = plainToClass(UserOverviewDto, overview, { excludeExtraneousValues: true });
    return new ResponseItem(resultDto, 'User overview fetched successfully');
  }
}
