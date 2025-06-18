import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchLogEntity } from '../entities/search-log.entity';

@Injectable()
export class SearchLogService {
  constructor(
    @InjectRepository(SearchLogEntity)
    private readonly _searchLogRepo: Repository<SearchLogEntity>
  ) {}

  async logSearch(university: string, country: string) {
    const log = this._searchLogRepo.create({ university, country });
    await this._searchLogRepo.save(log);
  }

  async getTopSearched(limit = 10) {
    return this._searchLogRepo
      .createQueryBuilder('log')
      .select('log.university', 'university')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.university')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async getTrafficByCountry(limit = 10) {
    return this._searchLogRepo
      .createQueryBuilder('log')
      .select('log.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.country')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  async totalSearches() {
    return this._searchLogRepo.count();
  }
}
