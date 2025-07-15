import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { groupBy } from 'lodash';

import { UniEntity } from '@UniversitiesModule/entities/uni.entity';
import { SearchLogService, TrackingService } from './services';
import { ContactSubmissionEntity } from '@ContactModule/entities';
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
    private readonly _trackingService: TrackingService
  ) {}

  async getSummary() {
    const universityCount = await this._uniRepo.count();
    const contactCount = await this._contactSubmissionRepo.count();

    const totalSearches = await this._searchLogService.totalSearches();

    const trafficRecords = await this._trackingService.getTrafficByCountry();
    const totalVisits = trafficRecords.reduce((sum, record) => sum + record.count, 0);

    return {
      universityCount,
      contactCount,
      totalSearches,
      totalVisits,
      hasData: universityCount > 0,
    };
  }

  async countByCountry() {
    return this._uniRepo
      .createQueryBuilder('uni')
      .select('uni.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .groupBy('uni.country')
      .getRawMany();
  }

  async topRankedPerCountry(limitPerCountry = 3) {
    const raw = await this._uniRepo
      .createQueryBuilder('uni')
      .select(['uni.id', 'uni.university', 'uni.country', 'uni.rank'])
      .where('uni.rank IS NOT NULL')
      .orderBy('uni.country', 'ASC')
      .addOrderBy('uni.rank', 'ASC')
      .getMany();

    const grouped = groupBy(raw, 'country');

    const result = Object.entries(grouped).map(([country, universities]: [string, UniEntity[]]) => ({
      country,
      universities: universities.slice(0, limitPerCountry),
    }));

    return result;
  }

  async subjectStats() {
    const fields = [
      'agricultural_veterinary_sciences',
      'arts_design',
      'business_management_law',
      'education_training',
      'engineering_technology',
      'health_medicine',
      'humanities_languages',
      'ict',
      'natural_sciences',
      'social_behavioral_sciences',
      'services',
      'transport_safety_security_military',
    ];

    const results: Record<string, number> = {};
    for (const field of fields) {
      const count = await this._uniRepo
        .createQueryBuilder('uni')
        .leftJoin('uni.academicFields', 'academicField')
        .where('LOWER(academicField.name) = :fieldName', { fieldName: field })
        .getCount();

      results[field] = count;
    }

    return results;
  }

  async getTopSearched(limit = 10) {
    return this._searchLogService.getTopSearched(limit);
  }

  async getTrafficByCountry(limit = 10) {
    return this._searchLogService.getTrafficByCountry(limit);
  }
  async getUserOverview(): Promise<ResponseItem<UserOverviewDto>> {
    try {
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
    } catch (error) {
      this.logger.error('Error fetching user overview:', error.message, error.stack);
      throw new Error('Failed to fetch user overview data.');
    }
  }
}
