import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLogEntity } from '../entities/search-log.entity';

@Injectable()
export class SearchLogService {
  constructor(
    @InjectRepository(SearchLogEntity)
    private readonly searchLogRepo: Repository<SearchLogEntity>
  ) {}

  async logSearch(university: string, country: string) {
    const log = this.searchLogRepo.create({ university, country });
    await this.searchLogRepo.save(log);
  }

  async getTopSearched(limit = 10) {
    return this.searchLogRepo
      .createQueryBuilder('log')
      .select('log.university', 'university')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.university')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getTrafficByCountry(limit = 10) {
    return this.searchLogRepo
      .createQueryBuilder('log')
      .select('log.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.country')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async totalSearches() {
    return this.searchLogRepo.count();
  }
}
