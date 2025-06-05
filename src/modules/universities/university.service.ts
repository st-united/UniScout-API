import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UniEntity } from './entities/uni.entity';
import { GetUniversityDto, UniversitySizeEnum } from './dto/get-university.dto';

@Injectable()
export class UniversityService {
  private readonly _logger = new Logger(UniversityService.name);
  private readonly _FUZZY_THRESHOLD: number = parseFloat(process.env.FUZZY_SEARCH_THRESHOLD || '0.3');

  constructor(
    @InjectRepository(UniEntity)
    private readonly _uniRepository: Repository<UniEntity>
  ) {}

  async findAll(query?: GetUniversityDto): Promise<UniEntity[]> {
    try {
      const qb = this._uniRepository.createQueryBuilder('uni');

      if (query?.search) {
        qb.andWhere('similarity(uni.university, :search) > :threshold', {
          search: query.search,
          threshold: this._FUZZY_THRESHOLD,
        });
        qb.orderBy('similarity(uni.university, :search)', 'ASC');
        qb.addOrderBy('uni.id', 'ASC');
      } else {
        qb.orderBy('uni.id', 'ASC');
      }

      if (query?.minRank) {
        qb.andWhere('uni.rank >= :minRank', { minRank: query.minRank });
      }
      if (query?.maxRank) {
        qb.andWhere('uni.rank <= :maxRank', { maxRank: query.maxRank });
      }

      if (query?.rank) {
        qb.andWhere('uni.rank = :rank', { rank: query.rank });
      }

      if (query?.type) {
        qb.andWhere('uni.type = :type', { type: query.type });
      }

      if (query?.country) {
        qb.andWhere(
          new Array(query.country.length)
            .fill(0)
            .map((_, i) => `uni.country ILIKE :country_${i}`)
            .join(' OR '),
          query.country.reduce((acc, curr, i) => ({ ...acc, [`country_${i}`]: curr }), {})
        );
      }

      if (query?.location) {
        qb.andWhere('uni.location ILIKE :location', { location: `%${query.location}%` });
      }

      if (query?.size) {
        switch (query.size) {
          case UniversitySizeEnum.SMALL:
            qb.andWhere('uni.studentPopulation < :smallThreshold', { smallThreshold: 20000 });
            break;
          case UniversitySizeEnum.MEDIUM:
            qb.andWhere('uni.studentPopulation >= :smallThreshold AND uni.studentPopulation < :mediumThreshold', {
              smallThreshold: 20000,
              mediumThreshold: 40000,
            });
            break;
          case UniversitySizeEnum.LARGE:
            qb.andWhere('uni.studentPopulation >= :mediumThreshold AND uni.studentPopulation < :largeThreshold', {
              mediumThreshold: 40000,
              largeThreshold: 100000,
            });
            break;
          case UniversitySizeEnum.MEGA_LARGE:
            qb.andWhere('uni.studentPopulation >= :largeThreshold', { largeThreshold: 100000 });
            break;
        }
      }

      if (query?.fields) {
        Object.entries(query.fields).forEach(([key, value]) => {
          if (value === true) {
            qb.andWhere(`uni.${key} = true`);
          }
        });
      }

      const page = query?.page ?? 1;
      const limit = query?.limit ?? 12;
      qb.skip((page - 1) * limit).take(limit);

      return await qb.getMany();
    } catch (error) {
      this._logger.error(`Error fetching universities: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch universities: ${error.message}`);
    }
  }

  async getUniversity(id: number): Promise<UniEntity> {
    try {
      const university = await this._uniRepository.findOne({ where: { id } });

      if (!university) {
        throw new NotFoundException(`University with ID ${id} not found.`);
      }
      return university;
    } catch (error) {
      this._logger.error(`Error fetching university: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) throw error;

      throw new InternalServerErrorException(`Database error: ${error.message}`);
    }
  }

  async getValidCountries(): Promise<string[]> {
    const countries = await this._uniRepository
      .createQueryBuilder('uni')
      .select('DISTINCT uni.country', 'country')
      .getRawMany();

    return countries.map((c) => c.country);
  }
}
