import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { SearchLogEntity } from '../entities/search-log.entity';
import { UniEntity } from '@UniversitiesModule/entities/uni.entity';

@Injectable()
export class SearchLogService {
  constructor(
    @InjectRepository(SearchLogEntity)
    private readonly _searchLogRepo: Repository<SearchLogEntity>,
    @InjectRepository(UniEntity)
    private readonly _uniRepo: Repository<UniEntity>
  ) {}

  async logSearch(university: string) {
    if (!university || university.trim().length < 2) return;
    const log = this._searchLogRepo.create({ university });
    await this._searchLogRepo.save(log);
  }

  async getTopSearched(limit = 5) {
    const logs = await this._searchLogRepo
      .createQueryBuilder('log')
      .select('log.university', 'searchTerm')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.university')
      .orderBy('count', 'DESC')
      .getRawMany();

    const enrichedMap = new Map<
      string,
      { name: string; logo: string | null; country: string; location: string | null; count: number }
    >();

    for (const entry of logs) {
      const term = entry.searchTerm;
      if (!term) continue;

      const uni = await this._uniRepo.findOne({
        where: { university: ILike(`%${term}%`) },
      });

      if (uni && !enrichedMap.has(uni.university)) {
        enrichedMap.set(uni.university, {
          name: uni.university,
          logo: uni.logo || null,
          country: uni.country,
          location: uni.location || null,
          count: Number(entry.count),
        });
      }

      if (enrichedMap.size >= limit) break;
    }
    return Array.from(enrichedMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async totalSearches() {
    return this._searchLogRepo.count();
  }
}
