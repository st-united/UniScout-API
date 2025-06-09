import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { groupBy } from 'lodash';

import { UniEntity } from '@UniversitiesModule/entities/uni.entity';
import { SearchLogService, TrackingService } from './services';
import { ContactSubmissionEntity } from '@ContactModule/entities';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(UniEntity)
    private readonly _uniRepo: Repository<UniEntity>,
    @InjectRepository(ContactSubmissionEntity)
    private readonly _contactSubmissionRepo: Repository<ContactSubmissionEntity>,
    private readonly _searchLogService: SearchLogService,
    private readonly _trackingService: TrackingService
  ) {}

  async getSummary() {
    const universityCount = await this._uniRepo.count();
    const contactCount = await this._contactSubmissionRepo.count(); // Modified

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
      'agriculturalFoodScience',
      'artsDesign',
      'economicsBusinessManagement',
      'engineering',
      'lawPoliticalScience',
      'medicinePharmacyHealthSciences',
      'physicalScience',
      'socialSciencesHumanities',
      'sportsPhysicalEducation',
      'technology',
      'theology',
    ];

    const results: Record<string, number> = {};
    for (const field of fields) {
      const count = await this._uniRepo.count({ where: { [field]: true } });
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
}
