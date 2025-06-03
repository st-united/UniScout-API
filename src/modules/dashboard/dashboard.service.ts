import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';

import { UniEntity } from '@UniversitiesModule/entities/uni.entity';
import { SearchLogService, TrackingService } from './services';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(UniEntity)
    private readonly uniRepo: Repository<UniEntity>,
    private readonly searchLogService: SearchLogService,
    private readonly trackingService: TrackingService
  ) {}

  async getSummary() {
    const universityCount = await this.uniRepo.count();
    const contactCount = 0; // TODO: Integrate with contact

    const totalSearches = await this.searchLogService.totalSearches();

    const trafficRecords = await this.trackingService.getTrafficByCountry();
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
    return this.uniRepo
      .createQueryBuilder('uni')
      .select('uni.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .groupBy('uni.country')
      .getRawMany();
  }

  async topRanked(limit = 10) {
    return this.uniRepo.find({
      where: { rank: Not(IsNull()) },
      order: { rank: 'ASC' },
      take: limit,
    });
  }

  async subjectStats() {
    const fields = [
      'agricultural_food_science',
      'arts_design',
      'economics_business_management',
      'engineering',
      'law_political_science',
      'medicine_pharmacy_health_sciences',
      'physical_science',
      'social_sciences_humanities',
      'sports_physical_education',
      'technology',
      'theology',
    ];

    const results: Record<string, number> = {};
    for (const field of fields) {
      const count = await this.uniRepo.count({ where: { [field]: true } });
      results[field] = count;
    }

    return results;
  }

  async getTopSearched(limit = 10) {
    return this.searchLogService.getTopSearched(limit);
  }

  async getTrafficByCountry(limit = 10) {
    return this.searchLogService.getTrafficByCountry(limit);
  }
}
